import Link from "next/link";
import {
  Users,
  CircleDollarSign,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Plus,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTreasury } from "@/lib/fiber/service";
import { ckbEquivalent, CKB_PER_USD } from "@/lib/constants";
import { getCkbUsdPrice, approxUsd } from "@/lib/price";
import { formatMoney, formatCkb, formatDate, initials } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { RetryAllButton } from "@/components/dashboard/retry-all-button";
import { TreasuryHero } from "@/components/dashboard/treasury-hero";
import { NextRunCard } from "@/components/dashboard/next-run-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
          stablecoin: true,
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

  // Average settlement time (request → settled) over the last 20 payments.
  const recentSettled = await prisma.payment.findMany({
    where: { status: "SUCCESS", payrollItem: { batch: { companyId } } },
    orderBy: { settledAt: "desc" },
    take: 20,
    select: { settledAt: true, events: { select: { stage: true, createdAt: true } } },
  });
  const durations = recentSettled
    .map((p) => {
      const start = p.events.find((e) => e.stage === "PAYMENT_REQUESTED")?.createdAt;
      const end = p.events.find((e) => e.stage === "SETTLED")?.createdAt ?? p.settledAt;
      if (!start || !end) return null;
      return (new Date(end).getTime() - new Date(start).getTime()) / 1000;
    })
    .filter((d): d is number => d != null && d >= 0);
  const avgSettle = durations.length
    ? `${Math.max(1, Math.round(durations.reduce((a, b) => a + b, 0) / durations.length))}s`
    : null;

  // Sums are kept in CKB terms; USD-pegged assets convert at the live rate.
  const ckbPerUsd = ckbUsd && ckbUsd > 0 ? 1 / ckbUsd : CKB_PER_USD;
  const totalPaid = settledPayments.reduce(
    (s, p) => s + ckbEquivalent(p.amount, p.stablecoin, ckbPerUsd),
    0,
  );
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
      .reduce((s, p) => s + ckbEquivalent(p.amount, p.stablecoin, ckbPerUsd), 0);
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
  const paidTodayTotal = paidToday.reduce(
    (s, p) => s + ckbEquivalent(p.amount, p.stablecoin, ckbPerUsd),
    0,
  );
  const awaitingRuns = batches.filter((b) => b.status === "DRAFT" || b.status === "APPROVED");
  const failedCount = allItems.filter((i) => i.status === "FAILED").length;

  const greetingParts = [
    paidToday.length
      ? `${formatCkb(paidTodayTotal)} paid today across ${paidToday.length} payment${paidToday.length === 1 ? "" : "s"}`
      : "No payments today",
    awaitingRuns.length
      ? `${awaitingRuns.length} run${awaitingRuns.length === 1 ? "" : "s"} awaiting action`
      : null,
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
  const nextRunPayments = nextRun
    ? await prisma.payrollItem.count({ where: { batchId: nextRun.id } })
    : 0;

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={
          <>
            {greetingParts.join(" · ")}
            {failedCount > 0 && (
              <>
                {" · "}
                <span className="font-medium text-destructive">
                  {failedCount} failed payment{failedCount === 1 ? "" : "s"} to retry
                </span>
              </>
            )}
          </>
        }
      />

      {/* Hero row — treasury + next run (prototype layout) */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <TreasuryHero
          totalCkb={treasury.live ? treasury.totalCkb : treasury.balance}
          usd={treasury.live ? approxUsd(treasury.totalCkb, ckbUsd) : null}
          channelCkb={treasury.live ? treasury.channelCkb : 0}
          onchainCkb={treasury.live ? treasury.onchainCkb : 0}
          avgSettle={avgSettle}
          live={treasury.live}
          nodeOk={treasury.live ? treasury.nodeOk : false}
          alert={
            treasuryAlert ??
            (treasury.live && !treasury.nodeOk
              ? "Fiber node unreachable — channel balance unknown; payments are blocked until it's back."
              : undefined)
          }
        />
        <NextRunCard
          run={
            nextRun
              ? {
                  id: nextRun.id,
                  reference: nextRun.reference,
                  payrollMonth: nextRun.payrollMonth,
                  status: nextRun.status,
                  totalCkb: nextRun.totalAmount,
                  payments: nextRunPayments,
                }
              : null
          }
          channelCkb={treasury.live ? treasury.channelCkb : null}
        />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
        <StatCard label="Network fees" value={formatMoney(totalFees)} sub="paid to Fiber routers" icon={CircleDollarSign} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent payroll runs</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/payroll">
                View all <ArrowRight />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentBatches.length === 0 ? (
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
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Run</TableHead>
                    <TableHead>Payments</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBatches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell>
                        <Link href={`/dashboard/payroll/${b.id}`} className="group">
                          <p className="text-sm font-medium group-hover:text-primary group-hover:underline">
                            {b.reference}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {b.payrollMonth} · {formatDate(b.createdAt)}
                          </p>
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {b._count.items} {b._count.items === 1 ? "payment" : "payments"}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatMoney(b.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <StatusBadge status={b.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attention needed</CardTitle>
          </CardHeader>
          <CardContent className="flex h-[calc(100%-4rem)] flex-col gap-2">
            {failedItems.length === 0 ? (
              <div className="flex flex-col items-center rounded-lg border border-dashed px-4 py-10 text-center">
                <CheckCircle2 className="mb-2 h-8 w-8 text-success" />
                <p className="text-sm text-muted-foreground">
                  No critical issues requiring action right now.
                </p>
              </div>
            ) : (
              <>
                {failedItems.map((it) => (
                  <Link
                    key={it.id}
                    href={`/dashboard/payroll/${it.batchId}`}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-accent"
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
                ))}
                <div className="flex flex-1 flex-col justify-end gap-3 pt-1">
                  <p className="rounded-lg border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
                    No other critical issues requiring action.
                  </p>
                  <RetryAllButton />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
