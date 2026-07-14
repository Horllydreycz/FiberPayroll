import {
  CheckCircle2,
  Clock,
  XCircle,
  Timer,
  CircleDollarSign,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { ckbEquivalent } from "@/lib/constants";
import { getCkbPerUsd } from "@/lib/price";
import { formatMoney, formatDate, shortHash, explorerTxUrl } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function SettlementsPage() {
  const companyId = await requireCompanyId();

  const payments = await prisma.payment.findMany({
    where: { payrollItem: { batch: { companyId } } },
    orderBy: { createdAt: "desc" },
    include: {
      payrollItem: { include: { employee: true, batch: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
    take: 50,
  });

  const settled = payments.filter((p) => p.status === "SUCCESS");
  const pending = payments.filter((p) => p.status === "CREATED" || p.status === "INFLIGHT");
  const failed = payments.filter((p) => p.status === "FAILED");
  const ckbPerUsd = await getCkbPerUsd();
  const totalPaid = settled.reduce(
    (s, p) => s + ckbEquivalent(p.amount, p.stablecoin, ckbPerUsd),
    0,
  );
  const totalFees = settled.reduce((s, p) => s + p.fee, 0);
  const successRate = payments.length
    ? Math.round((settled.length / payments.length) * 100)
    : 100;

  // Average settlement time from request -> settled.
  const durations = settled
    .map((p) => {
      const start = p.events.find((e) => e.stage === "PAYMENT_REQUESTED")?.createdAt;
      const end = p.events.find((e) => e.stage === "SETTLED")?.createdAt ?? p.settledAt;
      if (!start || !end) return null;
      return (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    })
    .filter((n): n is number => n !== null && n >= 0);
  const avgTime = durations.length
    ? Math.max(1, Math.round(durations.reduce((a, b) => a + b, 0) / durations.length))
    : 0;

  return (
    <div>
      <PageHeader
        title="Settlements"
        description="Real-time view of payment settlement across the Fiber Network."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Total settled" value={formatMoney(totalPaid)} sub={`${settled.length} payments`} icon={CheckCircle2} accent="success" />
        <StatCard label="Pending" value={String(pending.length)} sub="in flight" icon={Clock} accent="warning" />
        <StatCard label="Failed" value={String(failed.length)} sub="need attention" icon={XCircle} accent="destructive" />
        <StatCard label="Avg settlement time" value={avgTime ? `${avgTime}s` : "—"} sub="request → settled" icon={Timer} />
        <StatCard label="Network fees" value={formatMoney(totalFees)} sub="paid to routers" icon={CircleDollarSign} />
        <StatCard label="Success rate" value={`${successRate}%`} icon={TrendingUp} accent="success" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent settlements</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Batch</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Payment hash</TableHead>
                <TableHead>On-chain</TableHead>
                <TableHead>Hops</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                    No settlements yet. Run a payroll to see live settlement here.
                  </TableCell>
                </TableRow>
              )}
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-sm font-medium">
                    {p.payrollItem.employee.fullName}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.payrollItem.batch.reference}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatMoney(p.amount, p.stablecoin)}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {shortHash(p.paymentHash)}
                  </TableCell>
                  <TableCell>
                    {p.onchainTxHash ? (
                      <a
                        href={explorerTxUrl(p.onchainTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        title="View the on-chain channel funding transaction on CKB explorer"
                      >
                        {shortHash(p.onchainTxHash)} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{p.routeHops}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(p.createdAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.payrollItem.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
