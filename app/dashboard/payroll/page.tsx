import Link from "next/link";
import { Plus, Wallet, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { formatMoney, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function PayrollPage() {
  const companyId = await requireCompanyId();
  const batches = await prisma.payrollBatch.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true } } },
  });

  return (
    <div>
      <PageHeader title="Payroll" description="Create, review and run payroll batches.">
        <Button asChild>
          <Link href="/dashboard/payroll/new">
            <Plus /> New payroll
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Reference</TableHead>
              <TableHead>Month</TableHead>
              <TableHead>Payments</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Created by</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {batches.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Wallet className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No payroll runs yet</p>
                    <Button asChild size="sm" className="mt-2">
                      <Link href="/dashboard/payroll/new">
                        <Plus /> Create your first payroll
                      </Link>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {batches.map((b) => (
              <TableRow key={b.id} className="cursor-pointer">
                <TableCell className="font-medium">
                  <Link href={`/dashboard/payroll/${b.id}`} className="hover:underline">
                    {b.reference}
                  </Link>
                </TableCell>
                <TableCell>{b.payrollMonth}</TableCell>
                <TableCell>{b._count.items}</TableCell>
                <TableCell className="text-right font-medium">{formatMoney(b.totalAmount)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{b.createdByName ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDate(b.createdAt)}</TableCell>
                <TableCell>
                  <StatusBadge status={b.status} />
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                    <Link href={`/dashboard/payroll/${b.id}`}>
                      <ArrowRight />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
