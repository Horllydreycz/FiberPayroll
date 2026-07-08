import { headers } from "next/headers";
import { requireCompanyId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { buildPayslipPdf } from "@/lib/payslip";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const item = await prisma.payrollItem.findFirst({
    where: { id: itemId, batch: { companyId } },
    include: { employee: true, batch: { include: { company: true } }, payment: true, payslip: true },
  });
  if (!item || !item.payslip) return new Response("Not found", { status: 404 });

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
    txHash: item.payment?.paymentHash ?? "",
    paidAt: item.payment?.settledAt ?? null,
  });

  return new Response(pdf as BodyInit, {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${item.payslip.number}.pdf"`,
    },
  });
}
