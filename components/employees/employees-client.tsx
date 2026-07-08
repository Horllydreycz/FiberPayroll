"use client";

import * as React from "react";
import { MoreHorizontal, Pencil, Trash2, Search, Plus, Upload, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteEmployee, type EmployeeInput } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmployeeFormDialog } from "./employee-form-dialog";
import { CsvImportDialog } from "./csv-import-dialog";
import { formatMoney, initials, shortHash } from "@/lib/utils";

export type EmployeeRow = EmployeeInput & { id: string };

const PAGE_SIZE = 8;

export function EmployeesClient({ employees }: { employees: EmployeeRow[] }) {
  const [query, setQuery] = React.useState("");
  const [country, setCountry] = React.useState("ALL");
  const [status, setStatus] = React.useState("ALL");
  const [page, setPage] = React.useState(0);
  const [formOpen, setFormOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<EmployeeRow | null>(null);

  const countries = React.useMemo(
    () => Array.from(new Set(employees.map((e) => e.country))).sort(),
    [employees],
  );

  const filtered = React.useMemo(() => {
    return employees.filter((e) => {
      const q = query.toLowerCase();
      const matchesQ =
        !q ||
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.walletAddress.toLowerCase().includes(q);
      const matchesC = country === "ALL" || e.country === country;
      const matchesS = status === "ALL" || e.status === status;
      return matchesQ && matchesC && matchesS;
    });
  }, [employees, query, country, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const pageRows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  React.useEffect(() => setPage(0), [query, country, status]);

  async function onDelete(emp: EmployeeRow) {
    if (!confirm(`Remove ${emp.fullName} from payroll?`)) return;
    const res = await deleteEmployee(emp.id);
    if (res.ok) toast.success("Employee removed");
    else toast.error(res.error ?? "Could not delete");
  }

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email or wallet…"
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All countries</SelectItem>
            {countries.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <Upload /> Import
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus /> Add
          </Button>
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Wallet</TableHead>
              <TableHead className="text-right">Salary</TableHead>
              <TableHead>Coin</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <Users className="h-8 w-8 text-muted-foreground" />
                    <p className="text-sm font-medium">No employees found</p>
                    <p className="text-xs text-muted-foreground">
                      Add a team member or import a CSV to get started.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{initials(e.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.fullName}</p>
                      <p className="truncate text-xs text-muted-foreground">{e.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{e.country}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{e.jobTitle || "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {shortHash(e.walletAddress, 8, 6)}
                </TableCell>
                <TableCell className="text-right text-sm font-medium">
                  {formatMoney(e.salaryAmount, e.currency)}
                </TableCell>
                <TableCell className="text-sm">{e.preferredStablecoin}</TableCell>
                <TableCell>
                  <StatusBadge status={e.status} />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onSelect={() => {
                          setEditing(e);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onSelect={() => onDelete(e)}
                      >
                        <Trash2 /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} employee{filtered.length === 1 ? "" : "s"}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Previous
            </Button>
            <span>
              Page {current + 1} of {pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      <EmployeeFormDialog open={formOpen} onOpenChange={setFormOpen} employee={editing} />
      <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
    </>
  );
}
