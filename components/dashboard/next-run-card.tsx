import Link from "next/link";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCkb } from "@/lib/utils";

/**
 * Frosted "Next run" card beside the treasury hero (from the design
 * prototype): the pending run, its liquidity check, and a CTA.
 */
export function NextRunCard({
  run,
  channelCkb,
}: {
  run: {
    id: string;
    reference: string;
    payrollMonth: string;
    status: string;
    totalCkb: number;
    payments: number;
  } | null;
  channelCkb: number | null;
}) {
  if (!run) {
    return (
      <Card className="flex flex-col p-6">
        <span className="text-[13px] font-semibold">Next run</span>
        <p className="mt-3 text-sm text-muted-foreground">
          No payroll waiting. Create one and it shows up here with its liquidity check.
        </p>
        <Button asChild size="sm" className="mt-auto w-full">
          <Link href="/dashboard/payroll/new">
            <Plus /> New payroll
          </Link>
        </Button>
      </Card>
    );
  }

  const covers = channelCkb != null && run.totalCkb <= channelCkb;
  const pct =
    channelCkb != null && channelCkb > 0 ? Math.min(100, (run.totalCkb / channelCkb) * 100) : 100;

  return (
    <Card className="flex flex-col p-6">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold">Next run</span>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
            run.status === "APPROVED"
              ? "bg-success/15 text-success"
              : "bg-warning/15 text-warning"
          }`}
        >
          {run.status === "APPROVED" ? "Approved" : "Draft"}
        </span>
      </div>
      <p className="mt-3 font-mono text-[15px] font-medium">{run.reference}</p>
      <p className="text-xs text-muted-foreground">
        {run.payrollMonth} · {run.payments} payment{run.payments === 1 ? "" : "s"} ·{" "}
        {formatCkb(run.totalCkb)}
      </p>

      {channelCkb != null && (
        <div className="mt-4 rounded-xl bg-muted/70 px-3.5 py-3">
          <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
            <span>Liquidity check</span>
            <span className={`font-mono font-semibold ${covers ? "text-primary" : "text-destructive"}`}>
              {covers
                ? `covers · ${formatCkb(channelCkb - run.totalCkb)} spare`
                : `short ${formatCkb(run.totalCkb - channelCkb)}`}
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: covers
                  ? "linear-gradient(to right, oklch(0.47 0.1 162), oklch(0.6 0.13 155))"
                  : "linear-gradient(to right, oklch(0.55 0.19 27), oklch(0.65 0.17 25))",
              }}
            />
          </div>
        </div>
      )}

      <Button asChild size="sm" className="mt-4 w-full sm:mt-auto">
        <Link href={`/dashboard/payroll/${run.id}`}>Open run</Link>
      </Button>
    </Card>
  );
}
