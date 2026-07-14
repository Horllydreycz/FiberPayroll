"use server";

import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { buildPayslipPdf } from "@/lib/payslip";
import { sendEmail } from "@/lib/email";

/** Email the payslip PDF to the employee it belongs to. */
export async function emailPayslipAction(itemId: string) {
  const user = await requireUser();

  const item = await prisma.payrollItem.findFirst({
    where: { id: itemId, batch: { companyId: user.companyId } },
    include: { employee: true, batch: { include: { company: true } }, payment: true, payslip: true },
  });
  if (!item?.payslip) return { ok: false, error: "Payslip not found" };

  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const verifyUrl = `${proto}://${host}/verify/${item.payslip.verifyToken}`;

  const pdf = await buildPayslipPdf({
    company: item.batch.company.name,
    number: item.payslip.number,
    verifyUrl,
    employee: {
      name: item.employee.fullName,
      email: item.employee.email,
      country: item.employee.country,
      jobTitle: item.employee.jobTitle,
    },
    month: item.batch.payrollMonth,
    gross: item.grossAmount,
    tax: item.taxAmount,
    net: item.netAmount,
    currency: item.currency,
    stablecoinAmount: item.stablecoinAmount,
    stablecoin: item.stablecoin,
    usdAmount: item.payment?.usdAmount,
    usdRate: item.payment?.usdRate,
    txHash: item.payment?.paymentHash ?? "",
    paidAt: item.payment?.settledAt ?? null,
  });

  const result = await sendEmail({
    to: item.employee.email,
    subject: `Payslip ${item.payslip.number} — ${item.batch.payrollMonth}`,
    text: `Hi ${item.employee.fullName.split(" ")[0]},\n\nYour salary for ${item.batch.payrollMonth} has been paid over the Fiber Network. Your payslip is attached.\n\nVerify it anytime: ${verifyUrl}\n\n— ${item.batch.company.name} via FiberPayroll`,
    attachment: { filename: `${item.payslip.number}.pdf`, content: pdf },
  });

  if (result.ok) {
    await prisma.auditLog.create({
      data: {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 10),
        companyId: user.companyId,
        action: "PAYSLIP_EMAILED",
        detail: `${item.payslip.number} → ${item.employee.email}`,
        actorName: user.name,
      },
    });
  }
  return result;
}
