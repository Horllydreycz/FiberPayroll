"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { createPayroll } from "@/app/actions/payroll";
import { toStablecoin, DEFAULT_TAX_RATE } from "@/lib/constants";
import { formatMoney, initials } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export type SelectableEmployee = {
  id: string;
  fullName: string;
  email: string;
  country: string;
  salaryAmount: number;
  currency: string;
  preferredStablecoin: string;
};

export function CreatePayrollClient({
  employees,
  defaultMonth,
  stablecoin,
}: {
  employees: SelectableEmployee[];
  defaultMonth: string;
  stablecoin: string;
}) {
  const router = useRouter();
  const [month, setMonth] = React.useState(defaultMonth);
  const [selected, setSelected] = React.useState<Set<string>>(new Set(employees.map((e) => e.id)));
  const [pending, setPending] = React.useState(false);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const allSelected = selected.size === employees.length && employees.length > 0;
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(employees.map((e) => e.id)));

  const net = (e: SelectableEmployee) => e.salaryAmount * (1 - DEFAULT_TAX_RATE);
  const stableFor = (e: SelectableEmployee) => toStablecoin(net(e), e.currency);

  const total = employees
    .filter((e) => selected.has(e.id))
    .reduce((sum, e) => sum + stableFor(e), 0);

  async function submit() {
    if (selected.size === 0) {
      toast.error("Select at least one employee.");
      return;
    }
    setPending(true);
    const res = await createPayroll({ employeeIds: [...selected], month });
    if (res.ok && res.id) {
      toast.success("Payroll draft created");
      router.push(`/dashboard/payroll/${res.id}`);
    } else {
      toast.error(res.error ?? "Could not create payroll");
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <div className="flex items-center justify-between border-b p-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
              Select all ({employees.length})
            </label>
            <span className="text-sm text-muted-foreground">{selected.size} selected</span>
          </div>
          <CardContent className="p-0">
            <ul className="divide-y">
              {employees.map((e) => (
                <li
                  key={e.id}
                  className="flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
                  onClick={() => toggle(e.id)}
                >
                  <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{initials(e.fullName)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{e.fullName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {e.country} · {formatMoney(e.salaryAmount, e.currency)} gross
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatMoney(stableFor(e))}</p>
                    <Badge variant="muted" className="mt-0.5">
                      {stablecoin}
                    </Badge>
                  </div>
                </li>
              ))}
              {employees.length === 0 && (
                <li className="py-12 text-center text-sm text-muted-foreground">
                  No active employees. Add employees first.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-20">
          <CardContent className="space-y-4 p-5">
            <div className="space-y-1.5">
              <Label htmlFor="month">Payroll month</Label>
              <Input id="month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>

            <div className="space-y-2 rounded-lg border bg-muted/30 p-4">
              <Row label="Employees" value={String(selected.size)} />
              <Row label="Tax withheld" value={`${DEFAULT_TAX_RATE * 100}%`} />
              <Row label="Stablecoin" value={stablecoin} />
              <div className="my-2 h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total payout</span>
                <span className="text-lg font-semibold">{formatMoney(total)}</span>
              </div>
            </div>

            <Button className="w-full" onClick={submit} disabled={pending || selected.size === 0}>
              {pending ? <Loader2 className="animate-spin" /> : <Wallet />} Generate payroll
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Creates a draft you can review before approving.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
