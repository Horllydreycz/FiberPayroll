import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, CheckCircle2, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { formatMoney, formatDate, shortHash, explorerTxUrl } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default async function PayslipPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const companyId = await requireCompanyId();

  const item = await prisma.payrollItem.findFirst({
    where: { id: itemId, batch: { companyId } },
    include: { employee: true, batch: { include: { company: true } }, payment: true, payslip: true },
  });
  if (!item || !item.payslip) notFound();

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-3 -ml-2">
        <Link href={`/dashboard/payroll/${id}`}>
          <ArrowLeft /> Back to payroll
        </Link>
      </Button>
      <PageHeader title={`Payslip ${item.payslip.number}`} description={item.batch.payrollMonth}>
        <Button asChild>
          <a href={`/api/payslip/${item.id}`} target="_blank" rel="noopener noreferrer">
            <Download /> Download PDF
          </a>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-lg font-semibold">{item.batch.company.name}</p>
              <p className="text-sm text-muted-foreground">Payslip · {item.payslip.number}</p>
            </div>
            <Badge variant="success">
              <CheckCircle2 className="h-3 w-3" /> Settled
            </Badge>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Employee</p>
            <p className="font-medium">{item.employee.fullName}</p>
            <p className="text-sm text-muted-foreground">{item.employee.email}</p>
            <p className="text-sm text-muted-foreground">
              {item.employee.jobTitle ? `${item.employee.jobTitle} · ` : ""}
              {item.employee.country}
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Salary breakdown</p>
            <Line label="Gross pay" value={formatMoney(item.grossAmount, item.currency)} />
            <Line label="Tax withheld" value={`-${formatMoney(item.taxAmount, item.currency)}`} />
            <Separator className="my-2" />
            <div className="flex items-center justify-between">
              <span className="font-medium">Net pay</span>
              <span className="text-lg font-semibold text-success">{formatMoney(item.netAmount, item.currency)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Paid in {item.stablecoin}</span>
              <span className="font-medium">
                {formatMoney(item.stablecoinAmount)} {item.stablecoin}
              </span>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Payment proof</p>
            <Line label="Fiber payment hash" value={shortHash(item.payment?.paymentHash ?? "", 12, 10)} mono />
            {item.payment?.onchainTxHash && (
              <div className="flex items-center justify-between py-1 text-sm">
                <span className="text-muted-foreground">On-chain channel tx</span>
                <a
                  href={explorerTxUrl(item.payment.onchainTxHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                >
                  {shortHash(item.payment.onchainTxHash, 12, 10)} <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <Line label="Network fee" value={`${formatMoney(item.payment?.fee ?? 0)} ${item.stablecoin}`} />
            <Line label="Settled" value={item.payment?.settledAt ? formatDate(item.payment.settledAt, true) : "—"} />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Verify this payslip at /verify/{item.payslip.verifyToken.slice(0, 12)}…
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Line({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : ""}>{value}</span>
    </div>
  );
}
