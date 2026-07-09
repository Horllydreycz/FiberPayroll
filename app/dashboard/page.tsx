import Link from "next/link";
import {
  Wallet,
  Users,
  CircleDollarSign,
  Clock,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTreasury } from "@/lib/fiber/service";
import { getCkbUsdPrice, approxUsd } from "@/lib/price";
import { formatMoney, formatCkb, formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default async function DashboardPage() {
  const user = await requireUser();
  const companyId = user.companyId;
  const company = user.company;

  const [treasury, ckbUsd, activeEmployees, batches, settledPayments, allItems, failedItems, recentBatches] =
    await Promise.all([
      getTreasury(companyId),
      getCkbUsdPrice(),
      prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.payrollBatch.findMany({ where: { companyId } }),
      prisma.payment.findMany({
        // Strictly settled: payment SUCCESS, has a settlement timestamp, and
        // the payroll item itself is marked SETTLED.
        where: {
          status: "SUCCESS",
          settledAt: { not: null },
          payrollItem: { status: "SETTLED", batch: { companyId } },
        },
        select: {
          amount: true,
          fee: true,
          settledAt: true,
          payrollItem: { select: { batch: { select: { payrollMonth: true } } } },
        },
      }),
      prisma.payrollItem.findMany({
        where: { batch: { companyId } },
        select: { status: true },
      }),
      prisma.payrollItem.findMany({
        where: { batch: { companyId }, status: "FAILED" },
        include: { employee: true, batch: true },
        take: 5,
      }),
      prisma.payrollBatch.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { _count: { select: { items: true } } },
      }),
    ]);

  const totalPaid = settledPayments.reduce((s, p) => s + p.amount, 0);
  const totalFees = settledPayments.reduce((s, p) => s + p.fee, 0);
  const pending = batches.filter((b) => ["DRAFT", "APPROVED", "PROCESSING"].includes(b.status)).length;
  const completed = batches.filter((b) => b.status === "COMPLETED").length;
  const settledCount = allItems.filter((i) => i.status === "SETTLED").length;
  const successRate = allItems.length
    ? `${Math.round((settledCount / allItems.length) * 100)}%`
    : "—";

  const rawFirst = user.name.split(" ")[0];
  const firstName = rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1);

  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = monthKey(now);

  // Only successfully settled payments count as "paid" — drafts, in-flight,
  // failed and cancelled runs are excluded.
  const totalForMonth = (m: string) =>
    settledPayments
      .filter((p) => p.payrollItem.batch.payrollMonth === m)
      .reduce((s, p) => s + p.amount, 0);
  const monthTotal = totalForMonth(thisMonth);

  // Last 6 payroll months (oldest → newest) for the trend sparkline,
  // and previous month for the change chip.
  const lastMonths = Array.from({ length: 6 }, (_, i) =>
    monthKey(new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)),
  );
  const monthSeries = lastMonths.map(totalForMonth);
  const prevTotal = monthSeries[4];
  const paidDelta =
    prevTotal > 0
      ? {
          label: `${monthTotal >= prevTotal ? "+" : ""}${Math.round(((monthTotal - prevTotal) / prevTotal) * 100)}% vs ${lastMonths[4]}`,
          positive: monthTotal >= prevTotal,
        }
      : undefined;

  // Narrative greeting: facts with a verb — what happened, what needs action.
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const paidToday = settledPayments.filter((p) => p.settledAt && p.settledAt >= todayStart);
  const paidTodayTotal = paidToday.reduce((s, p) => s + p.amount, 0);
  const awaitingRuns = batches.filter((b) => b.status === "DRAFT" || b.status === "APPROVED");
  const failedCount = allItems.filter((i) => i.status === "FAILED").length;

  const greetingParts = [
    paidToday.length
      ? `${formatCkb(paidTodayTotal)} paid today across ${paidToday.length} payment${paidToday.length === 1 ? "" : "s"}`
      : "No payments today",
    awaitingRuns.length
      ? `${awaitingRuns.length} run${awaitingRuns.length === 1 ? "" : "s"} awaiting action`
      : null,
    failedCount ? `${failedCount} failed payment${failedCount === 1 ? "" : "s"} to retry` : null,
  ].filter(Boolean);

  // Exception: flag the treasury when channel liquidity can't cover the next run.
  const nextRun = awaitingRuns.sort((a, b) => +b.createdAt - +a.createdAt)[0];
  const treasuryAlert =
    treasury.live && nextRun && treasury.channelCkb < nextRun.totalAmount
      ? `Channel liquidity won't cover ${nextRun.reference} (${formatCkb(nextRun.totalAmount)} needed)`
      : undefined;
  if (!treasuryAlert && treasury.live && nextRun) {
    greetingParts.push("channel liquidity covers the next run");
  }

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={greetingParts.join(" · ")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Treasury balance"
          value={treasury.live ? formatCkb(treasury.totalCkb) : formatMoney(treasury.balance)}
          sub={
            treasury.live
              ? [
                  approxUsd(treasury.totalCkb, ckbUsd),
                  `${formatCkb(treasury.channelCkb)} in channels · ${formatCkb(treasury.onchainCkb)} on-chain`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : company.defaultStablecoin
          }
          icon={Wallet}
          alert={treasuryAlert}
        />
        <StatCard label="Active employees" value={String(activeEmployees)} sub="across your team" icon={Users} accent="primary" />
        <StatCard
          label="Paid this month"
          value={formatMoney(monthTotal)}
          sub={thisMonth}
          icon={CircleDollarSign}
          accent="success"
          delta={paidDelta}
          trend={monthSeries.filter((v) => v > 0).length >= 2 ? monthSeries : undefined}
        />
        <StatCard
          label="Settlement rate"
          value={successRate}
          sub={allItems.length ? `${settledCount}/${allItems.length} payments` : "no payments yet"}
          icon={TrendingUp}
          accent={failedCount ? "destructive" : "success"}
          alert={
            failedCount
              ? `${failedCount} payment${failedCount === 1 ? "" : "s"} failed — retry from the run page`
              : undefined
          }
        />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total paid" value={formatMoney(totalPaid)} sub="all time" icon={CheckCircle2} accent="success" />
        <StatCard label="Pending runs" value={String(pending)} sub="awaiting action" icon={Clock} accent="warning" />
        <StatCard label="Completed runs" value={String(completed)} icon={CheckCircle2} />
        <StatCard label="Network fees" value={formatMoney(totalFees)} sub="paid to Fiber routers" icon={CircleDollarSign} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent payroll runs</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/payroll">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {recentBatches.length === 0 && (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No payroll runs yet. Add employees, then run your first payroll.
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href="/dashboard/payroll/new">
                    <Plus /> Create payroll
                  </Link>
                </Button>
              </div>
            )}
            {recentBatches.map((b) => (
              <Link
                key={b.id}
                href={`/dashboard/payroll/${b.id}`}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-accent"
              >
                <div>
                  <p className="text-sm font-medium">{b.reference}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.payrollMonth} · {b._count.items} {b._count.items === 1 ? "payment" : "payments"} · {formatDate(b.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{formatMoney(b.totalAmount)}</span>
                  <StatusBadge status={b.status} />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention needed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {failedItems.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
                <p className="text-sm text-muted-foreground">No failed payments. All settled.</p>
              </div>
            ) : (
              failedItems.map((it) => (
                <Link
                  key={it.id}
                  href={`/dashboard/payroll/${it.batchId}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{initials(it.employee.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.employee.fullName}</p>
                    <p className="text-xs text-muted-foreground">{it.batch.reference}</p>
                  </div>
                  <StatusBadge status="FAILED" />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
