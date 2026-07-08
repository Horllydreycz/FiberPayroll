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

  const [treasury, activeEmployees, batches, settledPayments, allItems, failedItems, recentBatches] =
    await Promise.all([
      getTreasury(companyId),
      prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.payrollBatch.findMany({ where: { companyId } }),
      prisma.payment.findMany({
        where: { status: "SUCCESS", payrollItem: { batch: { companyId } } },
        select: { amount: true, fee: true },
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
  const successRate = allItems.length ? Math.round((settledCount / allItems.length) * 100) : 100;

  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const monthTotal = batches
    .filter((b) => b.payrollMonth === thisMonth)
    .reduce((s, b) => s + b.totalAmount, 0);

  return (
    <div>
      <PageHeader title={`Welcome back, ${user.name.split(" ")[0]}`} description="Here's what's happening with your payroll.">
        <Button asChild>
          <Link href="/dashboard/payroll/new">
            <Plus /> New payroll
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Treasury balance"
          value={treasury.live ? formatCkb(treasury.totalCkb) : formatMoney(treasury.balance)}
          sub={
            treasury.live
              ? `node: ${formatCkb(treasury.channelCkb)} in channels · ${formatCkb(treasury.onchainCkb)} on-chain`
              : company.defaultStablecoin
          }
          icon={Wallet}
        />
        <StatCard label="Active employees" value={String(activeEmployees)} sub="across your team" icon={Users} accent="primary" />
        <StatCard label="Paid this month" value={formatMoney(monthTotal)} sub={thisMonth} icon={CircleDollarSign} accent="success" />
        <StatCard label="Settlement rate" value={`${successRate}%`} sub={`${settledCount}/${allItems.length} payments`} icon={TrendingUp} accent="success" />
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
              <p className="py-8 text-center text-sm text-muted-foreground">No payroll runs yet.</p>
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
                    {b.payrollMonth} · {b._count.items} payments · {formatDate(b.createdAt)}
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
