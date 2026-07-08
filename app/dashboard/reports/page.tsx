import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { ReportsCharts } from "@/components/reports/reports-charts";
import { ExportButton } from "@/components/reports/export-button";

function topN(map: Map<string, number>, n = 6) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Math.round(value) }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export default async function ReportsPage() {
  const companyId = await requireCompanyId();

  const items = await prisma.payrollItem.findMany({
    where: { batch: { companyId } },
    include: { employee: true, batch: true },
  });

  const monthly = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byStablecoin = new Map<string, number>();
  const byDepartment = new Map<string, number>();

  for (const it of items) {
    const amt = it.stablecoinAmount;
    monthly.set(it.batch.payrollMonth, (monthly.get(it.batch.payrollMonth) ?? 0) + amt);
    byCountry.set(it.employee.country, (byCountry.get(it.employee.country) ?? 0) + amt);
    byStablecoin.set(it.stablecoin, (byStablecoin.get(it.stablecoin) ?? 0) + amt);
    const dept = it.employee.department || "Other";
    byDepartment.set(dept, (byDepartment.get(dept) ?? 0) + amt);
  }

  const monthlySeries = [...monthly.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, value]) => ({ name, value: Math.round(value) }));

  return (
    <div>
      <PageHeader title="Reports" description="Payroll analytics and accounting exports.">
        <ExportButton />
      </PageHeader>

      {items.length === 0 ? (
        <p className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          No payroll data yet. Run a payroll to populate reports.
        </p>
      ) : (
        <ReportsCharts
          monthly={monthlySeries}
          byCountry={topN(byCountry)}
          byStablecoin={topN(byStablecoin)}
          byDepartment={topN(byDepartment)}
        />
      )}
    </div>
  );
}
