"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cuid } from "@/lib/utils";
import {
  toPayoutAsset,
  ckbEquivalent,
  DEFAULT_TAX_RATE,
  PAYOUT_ASSET,
  STABLECOINS,
} from "@/lib/constants";
import { executeBatch, retryItem, syncBatch } from "@/lib/fiber/service";
import { getCkbPerUsd } from "@/lib/price";

// Payroll actions move money — viewers are read-only.
const FINANCE_ROLES = ["ADMIN", "FINANCE_MANAGER"];
const ROLE_ERROR = "Your role is view-only — ask an admin or finance manager.";
async function requireFinance() {
  const user = await requireUser();
  return FINANCE_ROLES.includes(user.role) ? user : null;
}

/** Create a DRAFT payroll batch with one item per selected employee. */
export async function createPayroll(input: { employeeIds: string[]; month: string }) {
  const user = await requireFinance();
  if (!user) return { ok: false, error: ROLE_ERROR };
  const { employeeIds, month } = input;
  if (!employeeIds.length) return { ok: false, error: "Select at least one employee." };

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, companyId: user.companyId },
  });
  if (!employees.length) return { ok: false, error: "No valid employees." };

  // Each item is denominated in the employee's payout asset; settlement over
  // the channel is the CKB equivalent at the LIVE CoinGecko rate.
  const ckbPerUsd = await getCkbPerUsd();
  const assetFor = (preferred: string) =>
    (STABLECOINS as readonly string[]).includes(preferred) ? preferred : PAYOUT_ASSET;

  // Next sequence number for the month. `reference` is globally unique, so
  // derive it from the highest existing reference (counting per-company breaks
  // as soon as a batch is deleted or a second company shares the month).
  const prefix = `PR-${month}-`;
  const last = await prisma.payrollBatch.findFirst({
    where: { reference: { startsWith: prefix } },
    orderBy: { reference: "desc" },
    select: { reference: true },
  });
  let seq = last ? (parseInt(last.reference.slice(prefix.length), 10) || 0) + 1 : 1;

  let total = 0;
  const items = employees.map((e) => {
    const asset = assetFor(e.preferredStablecoin);
    const gross = e.salaryAmount;
    const tax = Math.round(gross * DEFAULT_TAX_RATE * 100) / 100;
    const net = gross - tax;
    const stablecoinAmount = toPayoutAsset(net, e.currency, asset, ckbPerUsd);
    total += ckbEquivalent(stablecoinAmount, asset, ckbPerUsd);
    return {
      id: cuid(),
      grossAmount: gross,
      taxAmount: tax,
      netAmount: net,
      currency: e.currency,
      stablecoinAmount,
      stablecoin: asset,
      walletAddress: e.walletAddress,
      status: "PENDING",
      employeeId: e.id,
    };
  });

  // Single asset if uniform, otherwise a mixed-asset run (total stays in CKB).
  const assets = [...new Set(items.map((it) => it.stablecoin))];
  const stablecoin = assets.length === 1 ? assets[0] : "MULTI";

  // Create, bumping the sequence if a concurrent run grabbed the reference.
  let batch;
  let reference = "";
  for (let attempt = 0; ; attempt++) {
    reference = `${prefix}${String(seq).padStart(3, "0")}`;
    try {
      batch = await prisma.payrollBatch.create({
        data: {
          id: cuid(),
          reference,
          payrollMonth: month,
          status: "DRAFT",
          stablecoin,
          totalAmount: Math.round(total * 100) / 100,
          createdByName: user.name,
          companyId: user.companyId,
          items: { create: items },
        },
      });
      break;
    } catch (e) {
      const isDupRef =
        (e as { code?: string }).code === "P2002" && attempt < 5;
      if (!isDupRef) throw e;
      seq++;
    }
  }

  await prisma.auditLog.create({
    data: { id: cuid(), companyId: user.companyId, action: "PAYROLL_GENERATED", detail: `${reference} (${items.length} payments)`, actorName: user.name },
  });

  revalidatePath("/dashboard/payroll");
  return { ok: true, id: batch.id };
}

/** One click: recreate a run's employee set as a fresh draft for this month. */
export async function duplicatePayrollAction(batchId: string) {
  const user = await requireFinance();
  if (!user) return { ok: false, error: ROLE_ERROR };
  const batch = await prisma.payrollBatch.findFirst({
    where: { id: batchId, companyId: user.companyId },
    include: { items: { select: { employeeId: true } } },
  });
  if (!batch) return { ok: false, error: "Not found" };
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  // Re-runs the normal generator: fresh salaries, assets and FX for each employee.
  return createPayroll({ employeeIds: batch.items.map((i) => i.employeeId), month });
}

export async function approvePayroll(batchId: string) {
  const user = await requireFinance();
  if (!user) return { ok: false, error: ROLE_ERROR };
  const batch = await prisma.payrollBatch.findFirst({ where: { id: batchId, companyId: user.companyId } });
  if (!batch) return { ok: false, error: "Not found" };
  if (batch.status !== "DRAFT") return { ok: false, error: "Only drafts can be approved." };

  await prisma.payrollBatch.update({
    where: { id: batchId },
    data: { status: "APPROVED", approvedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { id: cuid(), companyId: user.companyId, action: "PAYROLL_APPROVED", detail: batch.reference, actorName: user.name },
  });
  revalidatePath(`/dashboard/payroll/${batchId}`);
  return { ok: true };
}

export async function executePayrollAction(batchId: string) {
  const user = await requireFinance();
  if (!user) return { ok: false, error: ROLE_ERROR };
  const batch = await prisma.payrollBatch.findFirst({ where: { id: batchId, companyId: user.companyId } });
  if (!batch) return { ok: false, error: "Not found" };
  try {
    await executeBatch(batchId, user.name);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath(`/dashboard/payroll/${batchId}`);
  return { ok: true };
}

/** Retry every failed payroll item for the company (funds-gated per item). */
export async function retryAllFailedAction() {
  const user = await requireFinance();
  if (!user) return { ok: false, retried: 0, errors: 1, error: ROLE_ERROR };
  const failed = await prisma.payrollItem.findMany({
    where: { status: "FAILED", batch: { companyId: user.companyId } },
    select: { id: true },
  });
  let retried = 0;
  let errors = 0;
  let firstError: string | null = null;
  for (const it of failed) {
    try {
      await retryItem(it.id, user.name);
      retried++;
    } catch (e) {
      errors++;
      firstError ??= (e as Error).message;
    }
  }
  revalidatePath("/dashboard");
  return { ok: true, retried, errors, error: firstError };
}

export async function retryPaymentAction(itemId: string) {
  const user = await requireFinance();
  if (!user) return { ok: false, error: ROLE_ERROR };
  try {
    await retryItem(itemId, user.name);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  return { ok: true };
}

export async function syncPayrollAction(batchId: string) {
  await syncBatch(batchId);
  return { ok: true };
}

export async function cancelPayroll(batchId: string) {
  const user = await requireFinance();
  if (!user) return { ok: false, error: ROLE_ERROR };
  const batch = await prisma.payrollBatch.findFirst({ where: { id: batchId, companyId: user.companyId } });
  if (!batch) return { ok: false, error: "Not found" };
  if (!["DRAFT", "APPROVED"].includes(batch.status)) return { ok: false, error: "Cannot cancel this run." };
  await prisma.payrollBatch.update({ where: { id: batchId }, data: { status: "CANCELLED" } });
  revalidatePath("/dashboard/payroll");
  return { ok: true };
}
