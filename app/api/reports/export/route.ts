import { requireCompanyId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// Accounting export — payroll ledger as CSV.
export async function GET() {
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }

  const items = await prisma.payrollItem.findMany({
    where: { batch: { companyId } },
    include: { employee: true, batch: true, payment: true },
    orderBy: { createdAt: "desc" },
  });

  const headers = [
    "Batch",
    "Month",
    "Employee",
    "Country",
    "Department",
    "Gross",
    "Tax",
    "Net",
    "Currency",
    "StablecoinAmount",
    "Stablecoin",
    "Status",
    "TxHash",
    "Fee",
  ];

  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = items.map((it) =>
    [
      it.batch.reference,
      it.batch.payrollMonth,
      it.employee.fullName,
      it.employee.country,
      it.employee.department ?? "",
      it.grossAmount,
      it.taxAmount,
      it.netAmount,
      it.currency,
      it.stablecoinAmount,
      it.stablecoin,
      it.status,
      it.payment?.paymentHash ?? "",
      it.payment?.fee ?? 0,
    ]
      .map(esc)
      .join(","),
  );

  const csv = [headers.map(esc).join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="payroll-ledger-${Date.now()}.csv"`,
    },
  });
}
