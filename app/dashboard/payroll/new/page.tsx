import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { PAYOUT_ASSET } from "@/lib/constants";
import { PageHeader } from "@/components/dashboard/page-header";
import { CreatePayrollClient } from "@/components/payroll/create-payroll-client";

export default async function NewPayrollPage() {
  const user = await requireUser();
  const employees = await prisma.employee.findMany({
    where: { companyId: user.companyId, status: "ACTIVE" },
    orderBy: { fullName: "asc" },
  });

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div>
      <PageHeader
        title="New payroll"
        description="Select who to pay and generate a payroll run."
      />
      <CreatePayrollClient
        employees={employees.map((e) => ({
          id: e.id,
          fullName: e.fullName,
          email: e.email,
          country: e.country,
          salaryAmount: e.salaryAmount,
          currency: e.currency,
          preferredStablecoin: e.preferredStablecoin,
        }))}
        defaultMonth={defaultMonth}
        stablecoin={PAYOUT_ASSET}
      />
    </div>
  );
}
