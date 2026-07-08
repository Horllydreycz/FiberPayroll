"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Loader2,
  Send,
  RefreshCw,
  ShieldCheck,
  Radio,
  Receipt,
  Copy,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { approvePayroll, executePayrollAction, retryPaymentAction } from "@/app/actions/payroll";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { formatMoney, initials, shortHash, explorerTxUrl } from "@/lib/utils";

export type DetailItem = {
  id: string;
  employee: string;
  country: string;
  netAmount: number;
  stablecoinAmount: number;
  currency: string;
  status: string;
  paymentHash: string | null;
  paymentStatus: string | null;
  onchainTxHash: string | null;
  fee: number;
  payslipId: string | null;
};

export type DetailBatch = {
  id: string;
  reference: string;
  payrollMonth: string;
  status: string;
  totalAmount: number;
  stablecoin: string;
  items: DetailItem[];
};

const ACTIVE = new Set(["PENDING", "BROADCASTING", "PROCESSING"]);

export function PayrollDetailClient({ initial }: { initial: DetailBatch }) {
  const router = useRouter();
  const [batch, setBatch] = React.useState(initial);
  const [busy, setBusy] = React.useState(false);
  const [retrying, setRetrying] = React.useState<string | null>(null);

  const isProcessing = batch.status === "PROCESSING";

  // Poll while the batch is settling.
  React.useEffect(() => {
    if (!isProcessing) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/payroll/${batch.id}/sync`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setBatch((b) => ({
          ...b,
          status: data.status,
          items: b.items.map((it) => {
            const u = data.items.find((x: { id: string }) => x.id === it.id);
            return u
              ? { ...it, status: u.status, paymentHash: u.paymentHash, paymentStatus: u.paymentStatus, onchainTxHash: u.onchainTxHash, fee: u.fee }
              : it;
          }),
        }));
        if (data.status !== "PROCESSING") router.refresh();
      } catch {
        /* ignore transient */
      }
    };
    const interval = setInterval(tick, 1200);
    tick();
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [isProcessing, batch.id, router]);

  const settled = batch.items.filter((i) => i.status === "SETTLED").length;
  const failed = batch.items.filter((i) => i.status === "FAILED").length;
  const progress = batch.items.length ? Math.round(((settled + failed) / batch.items.length) * 100) : 0;
  const totalFees = batch.items.reduce((s, i) => s + (i.fee || 0), 0);

  async function approve() {
    setBusy(true);
    const res = await approvePayroll(batch.id);
    if (res.ok) {
      setBatch((b) => ({ ...b, status: "APPROVED" }));
      toast.success("Payroll approved");
    } else toast.error(res.error ?? "Failed");
    setBusy(false);
  }

  async function execute() {
    setBusy(true);
    setBatch((b) => ({ ...b, status: "PROCESSING" }));
    const res = await executePayrollAction(batch.id);
    if (!res.ok) {
      toast.error(res.error ?? "Failed to execute");
      setBatch((b) => ({ ...b, status: "APPROVED" }));
    } else {
      toast.success("Payments broadcast on Fiber");
    }
    setBusy(false);
  }

  async function retry(itemId: string) {
    setRetrying(itemId);
    const res = await retryPaymentAction(itemId);
    if (res.ok) {
      setBatch((b) => ({
        ...b,
        status: "PROCESSING",
        items: b.items.map((it) => (it.id === itemId ? { ...it, status: "BROADCASTING" } : it)),
      }));
      toast.success("Retrying payment");
    } else {
      toast.error(res.error ?? "Retry failed");
    }
    setRetrying(null);
  }

  return (
    <div className="space-y-6">
      {/* Action bar */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 sm:grid-cols-4">
            <Meta label="Total payout" value={formatMoney(batch.totalAmount)} />
            <Meta label="Employees" value={String(batch.items.length)} />
            <Meta label="Stablecoin" value={batch.stablecoin} />
            <Meta label="Network fees" value={formatMoney(totalFees)} />
          </div>
          <div className="flex items-center gap-2">
            {batch.status === "DRAFT" && (
              <Button onClick={approve} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Approve payroll
              </Button>
            )}
            {batch.status === "APPROVED" && (
              <Button onClick={execute} disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Send />} Execute payments
              </Button>
            )}
            {batch.status === "PROCESSING" && (
              <>
                <Button variant="outline" onClick={execute} disabled={busy}>
                  {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Resume payments
                </Button>
                <Button disabled variant="secondary">
                  <Radio className="animate-pulse" /> Settling…
                </Button>
              </>
            )}
            {batch.status === "COMPLETED" && (
              <span className="flex items-center gap-2 text-sm font-medium text-success">
                <CheckCircle2 className="h-4 w-4" /> Completed
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Progress bar (during/after settlement) */}
      {batch.status !== "DRAFT" && batch.status !== "APPROVED" && (
        <Card>
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Settlement progress</span>
              <span className="text-muted-foreground">
                {settled} settled{failed ? ` · ${failed} failed` : ""} of {batch.items.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-violet-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4" /> Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Country</TableHead>
                <TableHead className="text-right">Net pay</TableHead>
                <TableHead>Payment hash</TableHead>
                <TableHead>On-chain</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {batch.items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{initials(it.employee)}</AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{it.employee}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{it.country}</TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatMoney(it.stablecoinAmount)}
                  </TableCell>
                  <TableCell>
                    {it.paymentHash ? (
                      <button
                        className="flex items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          navigator.clipboard.writeText(it.paymentHash!);
                          toast.success("Hash copied");
                        }}
                      >
                        {shortHash(it.paymentHash)} <Copy className="h-3 w-3" />
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {it.onchainTxHash ? (
                      <a
                        href={explorerTxUrl(it.onchainTxHash)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                        title="View the on-chain channel funding transaction on CKB explorer"
                      >
                        {shortHash(it.onchainTxHash)} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={it.status} />
                  </TableCell>
                  <TableCell>
                    {it.status === "FAILED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => retry(it.id)}
                        disabled={retrying === it.id}
                      >
                        {retrying === it.id ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry
                      </Button>
                    )}
                    {it.status === "SETTLED" && it.payslipId && (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/dashboard/payroll/${batch.id}/payslip/${it.id}`}>
                          <Receipt /> Payslip
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}
