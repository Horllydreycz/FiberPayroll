"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { cuid } from "@/lib/utils";
import { toPayoutCkb, DEFAULT_TAX_RATE, PAYOUT_ASSET } from "@/lib/constants";
import { executeBatch, retryItem, syncBatch } from "@/lib/fiber/service";

/** Create a DRAFT payroll batch with one item per selected employee. */
export async function createPayroll(input: { employeeIds: string[]; month: string }) {
  const user = await requireUser();
  const { employeeIds, month } = input;
  if (!employeeIds.length) return { ok: false, error: "Select at least one employee." };

  const employees = await prisma.employee.findMany({
    where: { id: { in: employeeIds }, companyId: user.companyId },
  });
  if (!employees.length) return { ok: false, error: "No valid employees." };

  // Payroll settles natively in CKB — the amount recorded is the amount sent.
  const stablecoin = PAYOUT_ASSET;

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
    const gross = e.salaryAmount;
    const tax = Math.round(gross * DEFAULT_TAX_RATE * 100) / 100;
    const net = gross - tax;
    const stablecoinAmount = toPayoutCkb(net, e.currency);
    total += stablecoinAmount;
    return {
      id: cuid(),
      grossAmount: gross,
      taxAmount: tax,
      netAmount: net,
      currency: e.currency,
      stablecoinAmount,
      stablecoin,
      walletAddress: e.walletAddress,
      status: "PENDING",
      employeeId: e.id,
    };
  });

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

export async function approvePayroll(batchId: string) {
  const user = await requireUser();
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
  const user = await requireUser();
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

export async function retryPaymentAction(itemId: string) {
  const user = await requireUser();
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
  const user = await requireUser();
  const batch = await prisma.payrollBatch.findFirst({ where: { id: batchId, companyId: user.companyId } });
  if (!batch) return { ok: false, error: "Not found" };
  if (!["DRAFT", "APPROVED"].includes(batch.status)) return { ok: false, error: "Cannot cancel this run." };
  await prisma.payrollBatch.update({ where: { id: batchId }, data: { status: "CANCELLED" } });
  revalidatePath("/dashboard/payroll");
  return { ok: true };
}
