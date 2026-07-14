import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { getTreasury } from "@/lib/fiber/service";
import { getCkbPerUsd } from "@/lib/price";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  PayrollDetailClient,
  type DetailBatch,
} from "@/components/payroll/payroll-detail-client";

export default async function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const companyId = await requireCompanyId();

  const batch = await prisma.payrollBatch.findFirst({
    where: { id, companyId },
    include: {
      items: {
        include: { employee: true, payment: true, payslip: true },
        orderBy: { employee: { fullName: "asc" } },
      },
    },
  });
  if (!batch) notFound();

  // Live channel liquidity + CKB/USD rate for the pre-execution check.
  const [treasury, ckbPerUsd] = await Promise.all([getTreasury(companyId), getCkbPerUsd()]);
  const channelCkb = treasury.live ? treasury.channelCkb : null;

  const initial: DetailBatch = {
    id: batch.id,
    reference: batch.reference,
    payrollMonth: batch.payrollMonth,
    status: batch.status,
    totalAmount: batch.totalAmount,
    stablecoin: batch.stablecoin,
    items: batch.items.map((it) => ({
      id: it.id,
      employee: it.employee.fullName,
      country: it.employee.country,
      netAmount: it.netAmount,
      stablecoinAmount: it.stablecoinAmount,
      stablecoin: it.stablecoin,
      currency: it.currency,
      status: it.status,
      paymentHash: it.payment?.paymentHash ?? null,
      paymentStatus: it.payment?.status ?? null,
      onchainTxHash: it.payment?.onchainTxHash ?? null,
      fee: it.payment?.fee ?? 0,
      payslipId: it.payslip?.id ?? null,
    })),
  };

  return (
    <div>
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href="/dashboard/payroll">
          <ArrowLeft /> Back to payroll
        </Link>
      </Button>
      <PageHeader
        title={batch.reference}
        description={`Payroll for ${batch.payrollMonth} · created ${formatDate(batch.createdAt)}`}
      >
        <StatusBadge status={batch.status} />
      </PageHeader>
      <PayrollDetailClient initial={initial} channelCkb={channelCkb} ckbPerUsd={ckbPerUsd} />
    </div>
  );
}
