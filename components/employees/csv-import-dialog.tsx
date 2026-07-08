"use client";

import * as React from "react";
import Papa from "papaparse";
import { Loader2, Upload, FileDown, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { importEmployees } from "@/app/actions/employees";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const REQUIRED = ["fullName", "email", "country", "walletAddress", "salaryAmount"];
const TEMPLATE_HEADERS = [
  "fullName",
  "email",
  "country",
  "jobTitle",
  "department",
  "walletAddress",
  "preferredStablecoin",
  "salaryAmount",
  "currency",
  "paymentFrequency",
  "employmentType",
  "taxId",
];

type Row = Record<string, string>;
type Validated = { row: Row; valid: boolean; reason?: string };

export function CsvImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [rows, setRows] = React.useState<Validated[]>([]);
  const [fileName, setFileName] = React.useState("");
  const [pending, setPending] = React.useState(false);

  function reset() {
    setRows([]);
    setFileName("");
  }

  function validate(parsed: Row[]): Validated[] {
    const seen = new Set<string>();
    return parsed.map((row) => {
      const missing = REQUIRED.filter((k) => !String(row[k] ?? "").trim());
      if (missing.length) return { row, valid: false, reason: `Missing ${missing.join(", ")}` };
      if (isNaN(Number(row.salaryAmount))) return { row, valid: false, reason: "Salary not a number" };
      const email = row.email.toLowerCase();
      if (seen.has(email)) return { row, valid: false, reason: "Duplicate in file" };
      seen.add(email);
      return { row, valid: true };
    });
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => setRows(validate(res.data)),
      error: () => toast.error("Could not parse CSV file."),
    });
  }

  function downloadTemplate() {
    const csv =
      TEMPLATE_HEADERS.join(",") +
      "\n" +
      "Jane Doe,jane@acme.com,United States,Engineer,Engineering,ckt1qexample,RUSD,8000,USD,MONTHLY,FULL_TIME,TAX-1001\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "employees-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport() {
    const valid = rows.filter((r) => r.valid).map((r) => r.row);
    if (!valid.length) {
      toast.error("No valid rows to import.");
      return;
    }
    setPending(true);
    try {
      const res = await importEmployees(valid);
      toast.success(`Imported ${res.imported} employees${res.skipped ? `, skipped ${res.skipped}` : ""}.`);
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Import failed.");
    } finally {
      setPending(false);
    }
  }

  const validCount = rows.filter((r) => r.valid).length;
  const invalidCount = rows.length - validCount;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-hidden sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import employees from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV to onboard your team in bulk. Required: fullName, email, country,
            walletAddress, salaryAmount.
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div className="space-y-4">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-10 text-center transition-colors hover:border-primary/50 hover:bg-accent/50">
              <Upload className="h-7 w-7 text-muted-foreground" />
              <span className="text-sm font-medium">Click to choose a CSV file</span>
              <span className="text-xs text-muted-foreground">or drag and drop</span>
              <input type="file" accept=".csv" className="hidden" onChange={onFile} />
            </label>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
              <FileDown /> Download template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">{fileName}</span>
              <Badge variant="success">
                <CheckCircle2 className="h-3 w-3" /> {validCount} valid
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  <AlertTriangle className="h-3 w-3" /> {invalidCount} skipped
                </Badge>
              )}
            </div>
            <div className="max-h-[40vh] overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={i} className={r.valid ? "" : "bg-destructive/5"}>
                      <TableCell className="font-medium">{r.row.fullName}</TableCell>
                      <TableCell className="text-muted-foreground">{r.row.email}</TableCell>
                      <TableCell>{r.row.country}</TableCell>
                      <TableCell>{r.row.salaryAmount}</TableCell>
                      <TableCell>
                        {r.valid ? (
                          <Badge variant="success">Valid</Badge>
                        ) : (
                          <Badge variant="destructive" title={r.reason}>
                            {r.reason}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <DialogFooter>
          {rows.length > 0 && (
            <Button variant="outline" onClick={reset} disabled={pending}>
              Choose another file
            </Button>
          )}
          <Button onClick={doImport} disabled={pending || validCount === 0}>
            {pending && <Loader2 className="animate-spin" />} Import {validCount > 0 ? `${validCount} ` : ""}
            employees
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
