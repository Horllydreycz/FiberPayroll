import { NextResponse } from "next/server";
import { requireCompanyId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { syncBatch } from "@/lib/fiber/service";

// Polled by the payroll detail page to advance + read settlement status.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let companyId: string;
  try {
    companyId = await requireCompanyId();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owned = await prisma.payrollBatch.findFirst({
    where: { id, companyId },
    select: { id: true },
  });
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const batch = await syncBatch(id);

  return NextResponse.json({
    id: batch.id,
    status: batch.status,
    items: batch.items.map((it) => ({
      id: it.id,
      status: it.status,
      employee: it.employee.fullName,
      paymentHash: it.payment?.paymentHash ?? null,
      paymentStatus: it.payment?.status ?? null,
      onchainTxHash: it.payment?.onchainTxHash ?? null,
      fee: it.payment?.fee ?? 0,
      events: it.payment?.events.map((e) => ({ stage: e.stage, at: e.createdAt })) ?? [],
    })),
  });
}
