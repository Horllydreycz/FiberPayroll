import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmployeesClient, type EmployeeRow } from "@/components/employees/employees-client";

export default async function EmployeesPage() {
  const companyId = await requireCompanyId();
  const employees = await prisma.employee.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    fullName: e.fullName,
    email: e.email,
    country: e.country,
    jobTitle: e.jobTitle ?? "",
    department: e.department ?? "",
    walletAddress: e.walletAddress,
    preferredStablecoin: e.preferredStablecoin,
    salaryAmount: e.salaryAmount,
    currency: e.currency,
    paymentFrequency: e.paymentFrequency,
    employmentType: e.employmentType,
    taxId: e.taxId ?? "",
    status: e.status,
    notes: e.notes ?? "",
  }));

  return (
    <div>
      <PageHeader title="Employees" description="Manage your global team and their payout details." />
      <EmployeesClient employees={rows} />
    </div>
  );
}
