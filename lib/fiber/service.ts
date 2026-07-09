// Payroll <-> Fiber orchestration. Bridges the Fiber adapter with the database:
// executes batches, syncs settlement status, records timeline events, generates
// payslips, and keeps the company treasury balance in sync.

import { prisma } from "@/lib/prisma";
import { cuid } from "@/lib/utils";
import { getCkbUsdPrice } from "@/lib/price";
import { fiber } from "./index";
import type { FiberPaymentStatus } from "./types";
import type { ItemStatus, SettlementStage } from "@/lib/constants";

// A payment that hasn't reached a terminal state within this window is marked
// FAILED (and becomes retryable) instead of pending forever.
const PAYMENT_TIMEOUT_MS = 60_000;

export type Treasury =
  | { live: true; onchainCkb: number; channelCkb: number; totalCkb: number }
  | { live: false; balance: number; stablecoin: string };

/**
 * The company treasury. In rpc mode this is the REAL balance of the employer's
 * Fiber node (on-chain wallet + channel outbound liquidity). In simulated mode
 * it falls back to the DB ledger balance.
 */
export async function getTreasury(companyId: string): Promise<Treasury> {
  const f = fiber();
  if (f.mode === "rpc" && f.getBalance) {
    const bal = await f.getBalance();
    if (bal) return { live: true, ...bal };
  }
  const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
  return { live: false, balance: company.balance, stablecoin: company.defaultStablecoin };
}

/**
 * Throw if the treasury can't cover the payments. Amounts are CKB — payroll is
 * CKB-native, so the recorded amount IS what moves over the channel. In rpc
 * mode the spendable amount is the node's channel outbound liquidity; in
 * simulated mode it's the DB balance.
 */
async function assertSufficientFunds(
  companyId: string,
  itemCount: number,
  totalCkb: number,
  asset: string,
) {
  if (itemCount <= 0) return;
  const f = fiber();
  if (f.mode === "rpc" && f.getBalance) {
    const bal = await f.getBalance();
    const available = bal?.channelCkb ?? 0;
    if (available < totalCkb) {
      throw new Error(
        available === 0
          ? "Insufficient funds: the company node has no spendable channel balance (node offline or channel unfunded)."
          : `Insufficient funds: ${itemCount} payment(s) total ${totalCkb.toFixed(4)} CKB, but the company node only has ${available.toFixed(4)} CKB of channel liquidity.`,
      );
    }
  } else {
    const company = await prisma.company.findUniqueOrThrow({ where: { id: companyId } });
    if (company.balance < totalCkb) {
      throw new Error(
        `Insufficient treasury balance: need ${totalCkb.toFixed(2)} ${asset}, have ${company.balance.toFixed(2)} ${asset}.`,
      );
    }
  }
}

function itemStatusFor(s: FiberPaymentStatus): ItemStatus {
  switch (s) {
    case "SUCCESS":
      return "SETTLED";
    case "FAILED":
      return "FAILED";
    case "INFLIGHT":
      return "PROCESSING";
    default:
      return "BROADCASTING";
  }
}

async function addEvent(paymentId: string, stage: SettlementStage, message?: string) {
  await prisma.settlementEvent.create({
    data: { id: cuid(), paymentId, stage, message },
  });
}

async function log(companyId: string, action: string, detail: string, actorName?: string) {
  await prisma.auditLog.create({
    data: { id: cuid(), companyId, action, detail, actorName },
  });
}

async function notify(
  companyId: string,
  type: "success" | "warning" | "error" | "info",
  title: string,
  body?: string,
) {
  await prisma.notification.create({
    data: { id: cuid(), companyId, type, title, body },
  });
}

/**
 * Kick off Fiber payments for every pending item in an approved batch.
 * Creates an invoice per employee and sends the payment, recording the
 * initial settlement timeline.
 */
export async function executeBatch(batchId: string, actorName?: string) {
  const batch = await prisma.payrollBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { items: { include: { employee: true, payment: true } } },
  });

  if (batch.status !== "APPROVED" && batch.status !== "PROCESSING") {
    throw new Error(`Batch must be APPROVED to execute (is ${batch.status}).`);
  }

  // Items this run will actually (re)pay — mirrors the skip logic in the loop.
  const toPay = batch.items.filter(
    (item) => !(item.payment && item.status !== "PENDING" && item.status !== "FAILED"),
  );

  // Funds gate: never start payments the treasury can't cover. Throws before
  // the batch is touched, so it stays APPROVED and the UI shows the reason.
  await assertSufficientFunds(
    batch.companyId,
    toPay.length,
    toPay.reduce((s, it) => s + it.stablecoinAmount, 0),
    batch.stablecoin,
  );

  await prisma.payrollBatch.update({
    where: { id: batchId },
    data: { status: "PROCESSING" },
  });

  const f = fiber();

  // Pre-flight health check: make sure the node is ready to pay (payout peer
  // connected) before we start, so the first payment never hits "liquidity 0".
  const pre = await f.ensureReady?.();
  if (pre && !pre.ready) {
    await notify(
      batch.companyId,
      "warning",
      "Fiber link not ready",
      `${pre.detail ?? "payout peer offline"} — payments will auto-retry.`,
    );
  }

  // Seed one deterministic failure when there are several items, to showcase
  // the retry flow during the demo.
  const failIndex = batch.items.length >= 4 ? 2 : -1;

  let i = 0;
  for (const item of batch.items) {
    if (item.payment && item.status !== "PENDING" && item.status !== "FAILED") {
      i++;
      continue;
    }

    try {
      const invoice = await f.createInvoice({
        amount: item.stablecoinAmount,
        stablecoin: item.stablecoin,
        payee: item.walletAddress,
        description: `Salary ${batch.payrollMonth} — ${item.employee.fullName}`,
      });

      const sent = await f.sendPayment({
        invoice: invoice.invoiceAddress,
        amount: item.stablecoinAmount,
        stablecoin: item.stablecoin,
        forceOutcome: i === failIndex ? "fail" : "success",
      });

      const payment = await prisma.payment.upsert({
        where: { payrollItemId: item.id },
        create: {
          id: cuid(),
          paymentHash: sent.paymentHash,
          invoice: invoice.invoiceAddress,
          amount: item.stablecoinAmount,
          stablecoin: item.stablecoin,
          status: sent.status,
          fee: sent.fee,
          routeHops: sent.routeHops,
          onchainTxHash: sent.onchainTxHash,
          payrollItemId: item.id,
        },
        update: {
          paymentHash: sent.paymentHash,
          invoice: invoice.invoiceAddress,
          status: sent.status,
          fee: sent.fee,
          onchainTxHash: sent.onchainTxHash,
          failedReason: null,
        },
      });

      await prisma.payrollItem.update({
        where: { id: item.id },
        data: { status: itemStatusFor(sent.status) },
      });

      await addEvent(payment.id, "PAYMENT_REQUESTED", "Invoice generated on Fiber");
      await addEvent(payment.id, "BROADCAST", `Payment broadcast (${sent.routeHops} hops)`);
    } catch (err) {
      // Don't strand the whole batch on one failure — mark this item FAILED so
      // it becomes individually retryable, and continue with the rest.
      const reason = (err as Error).message?.slice(0, 200) ?? "send failed";
      const payment = await prisma.payment.upsert({
        where: { payrollItemId: item.id },
        create: {
          id: cuid(),
          paymentHash: `failed-${cuid()}`,
          amount: item.stablecoinAmount,
          stablecoin: item.stablecoin,
          status: "FAILED",
          failedReason: reason,
          payrollItemId: item.id,
        },
        update: { status: "FAILED", failedReason: reason },
      });
      await prisma.payrollItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
      await addEvent(payment.id, "FAILED", reason);
    }
    i++;
  }

  await log(batch.companyId, "PAYROLL_EXECUTED", `Executed ${batch.reference} via Fiber`, actorName);
  await notify(batch.companyId, "info", "Payroll processing", `${batch.reference} is settling on Fiber.`);

  return syncBatch(batchId);
}

/**
 * Poll the Fiber node for each non-terminal payment in a batch and advance
 * statuses + timeline. Idempotent — safe to call from a polling client.
 */
export async function syncBatch(batchId: string) {
  const batch = await prisma.payrollBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { items: { include: { payment: { include: { events: true } }, employee: true } } },
  });

  const f = fiber();
  // One spot price per sync pass — stamped onto payments as they settle.
  const ckbUsd = await getCkbUsdPrice();

  for (const item of batch.items) {
    const payment = item.payment;
    if (!payment) continue;
    if (payment.status === "SUCCESS" || payment.status === "FAILED") {
      // Backfill the USD valuation if this payment settled before pricing
      // existed (or CoinGecko was down at settlement time).
      if (payment.status === "SUCCESS" && payment.usdAmount == null && ckbUsd != null) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { usdRate: ckbUsd, usdAmount: payment.amount * ckbUsd },
        });
      }
      continue;
    }

    const remote = await f.getPayment(payment.paymentHash);

    // Timeout: still not settled or failed after 60s since the last state
    // change (updatedAt resets on retry, so retries get a fresh window).
    if (
      remote.status !== "SUCCESS" &&
      remote.status !== "FAILED" &&
      Date.now() - payment.updatedAt.getTime() > PAYMENT_TIMEOUT_MS
    ) {
      const reason = `Timed out — no settlement within ${PAYMENT_TIMEOUT_MS / 1000}s`;
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "FAILED", failedReason: reason },
      });
      await prisma.payrollItem.update({ where: { id: item.id }, data: { status: "FAILED" } });
      await addEvent(payment.id, "FAILED", reason);
      await notify(batch.companyId, "error", "Payment timed out", `${item.employee.fullName}: ${reason}`);
      continue;
    }

    if (remote.status === payment.status) continue;

    const stages = payment.events.map((e) => e.stage);
    if (remote.status === "INFLIGHT" && !stages.includes("CONFIRMED")) {
      await addEvent(payment.id, "CONFIRMED", "Routing through payment channels");
    }
    if (remote.status === "SUCCESS") {
      await addEvent(payment.id, "SETTLED", "Funds received by employee");
    }
    if (remote.status === "FAILED") {
      await addEvent(payment.id, "FAILED", remote.failedReason ?? "Payment failed");
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: remote.status,
        fee: remote.fee || payment.fee,
        failedReason: remote.failedReason,
        settledAt: remote.status === "SUCCESS" ? new Date() : null,
        // Stamp the USD value of the payout at settlement time.
        ...(remote.status === "SUCCESS" && ckbUsd != null
          ? { usdRate: ckbUsd, usdAmount: payment.amount * ckbUsd }
          : {}),
      },
    });

    await prisma.payrollItem.update({
      where: { id: item.id },
      data: { status: itemStatusFor(remote.status) },
    });

    if (remote.status === "SUCCESS") {
      await ensurePayslip(item.id, item.employeeId);
    }
    if (remote.status === "FAILED") {
      await notify(
        batch.companyId,
        "error",
        "Payment failed",
        `${item.employee.fullName}: ${remote.failedReason ?? "unknown error"}`,
      );
    }
  }

  return finalizeBatch(batchId);
}

async function ensurePayslip(payrollItemId: string, employeeId: string) {
  // Concurrent syncs (the detail page polls) can race here, and `number` is
  // globally unique — so derive the next number from the highest existing one
  // and retry on unique-constraint collisions instead of trusting a count.
  const prefix = `PS-${new Date().getFullYear()}-`;
  const lastSlip = await prisma.payslip.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  let seq = lastSlip ? (parseInt(lastSlip.number.slice(prefix.length), 10) || 0) + 1 : 1;

  for (let attempt = 0; ; attempt++) {
    const existing = await prisma.payslip.findUnique({ where: { payrollItemId } });
    if (existing) return existing;
    try {
      return await prisma.payslip.create({
        data: {
          id: cuid(),
          number: `${prefix}${String(seq).padStart(5, "0")}`,
          verifyToken: cuid() + cuid(),
          payrollItemId,
          employeeId,
        },
      });
    } catch (e) {
      // P2002 = another sync created this payslip, or grabbed our number.
      if ((e as { code?: string }).code !== "P2002" || attempt >= 5) throw e;
      seq++;
    }
  }
}

/** Recompute batch status from its items; settle treasury + notify on completion. */
async function finalizeBatch(batchId: string) {
  const batch = await prisma.payrollBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: { items: { include: { payment: true } } },
  });

  const statuses = batch.items.map((it) => it.status);
  const allDone = statuses.every((s) => s === "SETTLED" || s === "FAILED");
  const anyPending = !allDone;

  if (anyPending) {
    if (batch.status !== "PROCESSING") {
      await prisma.payrollBatch.update({ where: { id: batchId }, data: { status: "PROCESSING" } });
    }
    return getBatchSummary(batchId);
  }

  const anySettled = statuses.includes("SETTLED");
  const newStatus = anySettled ? "COMPLETED" : "FAILED";

  if (batch.status !== newStatus) {
    await prisma.payrollBatch.update({
      where: { id: batchId },
      data: { status: newStatus, completedAt: new Date() },
    });

    // Deduct settled amounts from the company treasury once, on completion.
    const settledTotal = batch.items
      .filter((it) => it.status === "SETTLED")
      .reduce((sum, it) => sum + it.stablecoinAmount, 0);
    if (settledTotal > 0) {
      await prisma.company.update({
        where: { id: batch.companyId },
        data: { balance: { decrement: settledTotal } },
      });
    }

    await notify(
      batch.companyId,
      anySettled ? "success" : "error",
      anySettled ? "Payroll completed" : "Payroll failed",
      `${batch.reference}: ${statuses.filter((s) => s === "SETTLED").length}/${statuses.length} paid.`,
    );
    await log(batch.companyId, "PAYROLL_COMPLETED", `${batch.reference} -> ${newStatus}`);
  }

  return getBatchSummary(batchId);
}

/** Retry a single failed payroll item over Fiber. */
export async function retryItem(itemId: string, actorName?: string) {
  const item = await prisma.payrollItem.findUniqueOrThrow({
    where: { id: itemId },
    include: { payment: true, batch: true, employee: true },
  });
  if (item.status !== "FAILED") throw new Error("Only failed items can be retried.");

  await assertSufficientFunds(
    item.batch.companyId,
    1,
    item.stablecoinAmount,
    item.stablecoin,
  );

  const f = fiber();
  await f.ensureReady?.(); // re-peer before retrying so liquidity is available
  const invoice = await f.createInvoice({
    amount: item.stablecoinAmount,
    stablecoin: item.stablecoin,
    payee: item.walletAddress,
    description: `Retry — ${item.employee.fullName}`,
  });
  const sent = await f.sendPayment({
    invoice: invoice.invoiceAddress,
    amount: item.stablecoinAmount,
    stablecoin: item.stablecoin,
    forceOutcome: "success", // retries succeed in the demo
  });

  const payment = await prisma.payment.upsert({
    where: { payrollItemId: item.id },
    create: {
      id: cuid(),
      paymentHash: sent.paymentHash,
      invoice: invoice.invoiceAddress,
      amount: item.stablecoinAmount,
      stablecoin: item.stablecoin,
      status: sent.status,
      fee: sent.fee,
      routeHops: sent.routeHops,
      onchainTxHash: sent.onchainTxHash,
      payrollItemId: item.id,
    },
    update: {
      paymentHash: sent.paymentHash,
      invoice: invoice.invoiceAddress,
      status: sent.status,
      onchainTxHash: sent.onchainTxHash,
      failedReason: null,
      settledAt: null,
    },
  });
  await addEvent(payment.id, "PAYMENT_REQUESTED", "Retry — invoice regenerated");
  await addEvent(payment.id, "BROADCAST", "Retry broadcast on Fiber");

  await prisma.payrollItem.update({
    where: { id: item.id },
    data: { status: itemStatusFor(sent.status) },
  });
  await prisma.payrollBatch.update({
    where: { id: item.batchId },
    data: { status: "PROCESSING", completedAt: null },
  });
  await log(item.batch.companyId, "PAYMENT_RETRIED", `Retried ${item.employee.fullName}`, actorName);

  return syncBatch(item.batchId);
}

export async function getBatchSummary(batchId: string) {
  const batch = await prisma.payrollBatch.findUniqueOrThrow({
    where: { id: batchId },
    include: {
      items: {
        include: {
          employee: true,
          payment: { include: { events: { orderBy: { createdAt: "asc" } } } },
        },
      },
    },
  });
  return batch;
}
