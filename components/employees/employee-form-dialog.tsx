"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createEmployee, updateEmployee, type EmployeeInput } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STABLECOINS, CURRENCY_OPTIONS, EMPLOYMENT_TYPES, PAYMENT_FREQUENCIES } from "@/lib/constants";

type Employee = EmployeeInput & { id: string };

const EMPTY: EmployeeInput = {
  fullName: "",
  email: "",
  country: "",
  jobTitle: "",
  department: "",
  walletAddress: "",
  preferredStablecoin: "CKB",
  salaryAmount: 0,
  currency: "CKB",
  paymentFrequency: "MONTHLY",
  employmentType: "FULL_TIME",
  taxId: "",
  status: "ACTIVE",
  notes: "",
};

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee?: Employee | null;
}) {
  const [form, setForm] = React.useState<EmployeeInput>(EMPTY);
  const [pending, setPending] = React.useState(false);
  const isEdit = !!employee;

  React.useEffect(() => {
    if (open) setForm(employee ? { ...EMPTY, ...employee } : EMPTY);
  }, [open, employee]);

  const set = (k: keyof EmployeeInput, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      if (isEdit && employee) await updateEmployee(employee.id, form);
      else await createEmployee(form);
      toast.success(isEdit ? "Employee updated" : "Employee added");
      onOpenChange(false);
    } catch {
      toast.error("Could not save employee. Check the fields and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the employee's details." : "Add a team member to your payroll."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" required>
              <Input value={form.fullName} onChange={(e) => set("fullName", e.target.value)} required />
            </Field>
            <Field label="Email" required>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            </Field>
            <Field label="Country" required>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} required />
            </Field>
            <Field label="Job title">
              <Input value={form.jobTitle ?? ""} onChange={(e) => set("jobTitle", e.target.value)} />
            </Field>
            <Field label="Department">
              <Input value={form.department ?? ""} onChange={(e) => set("department", e.target.value)} />
            </Field>
            <Field label="Tax ID">
              <Input value={form.taxId ?? ""} onChange={(e) => set("taxId", e.target.value)} />
            </Field>
          </div>

          <Field label="Wallet address" required>
            <Input
              className="font-mono text-xs"
              value={form.walletAddress}
              onChange={(e) => set("walletAddress", e.target.value)}
              placeholder="ckt1q..."
              required
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Salary" required>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.salaryAmount || ""}
                onChange={(e) => set("salaryAmount", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Currency">
              <Pick value={form.currency} onChange={(v) => set("currency", v)} options={[...CURRENCY_OPTIONS]} />
            </Field>
            <Field label="Payout asset">
              <Pick value={form.preferredStablecoin} onChange={(v) => set("preferredStablecoin", v)} options={[...STABLECOINS]} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Frequency">
              <Pick value={form.paymentFrequency} onChange={(v) => set("paymentFrequency", v)} options={[...PAYMENT_FREQUENCIES]} />
            </Field>
            <Field label="Type">
              <Pick value={form.employmentType} onChange={(v) => set("employmentType", v)} options={[...EMPLOYMENT_TYPES]} />
            </Field>
            <Field label="Status">
              <Pick value={form.status} onChange={(v) => set("status", v)} options={["ACTIVE", "INACTIVE"]} />
            </Field>
          </div>

          <Field label="Notes">
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {isEdit ? "Save changes" : "Add employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Pick({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
