import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent = "primary",
  delta,
  trend,
  alert,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  accent?: "primary" | "success" | "warning" | "destructive";
  /** Small change chip next to the value, e.g. { label: "+12%", positive: true }. */
  delta?: { label: string; positive: boolean };
  /** Sparkline series (oldest → newest). Rendered only with 2+ points. */
  trend?: number[];
  /** Exception callout — draws attention with a warning border + message. */
  alert?: string;
}) {
  // Corporate register: icons stay neutral; only true semantics get color.
  const accentMap = {
    primary: "border bg-background text-muted-foreground",
    success: "border bg-background text-success",
    warning: "border bg-background text-warning",
    destructive: "border bg-background text-destructive",
  };
  return (
    <Card className={cn("p-5", alert && "border-warning/70")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
            {delta && (
              <span
                className={cn(
                  "shrink-0 rounded px-1.5 py-0.5 text-[11px] font-medium",
                  delta.positive
                    ? "bg-success/10 text-success"
                    : "bg-destructive/10 text-destructive",
                )}
              >
                {delta.label}
              </span>
            )}
          </div>
          {sub && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{sub}</p>}
        </div>
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accentMap[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {trend && trend.length > 1 && <Sparkline data={trend} />}
      {alert && <p className="mt-3 text-xs font-medium text-warning">{alert}</p>}
    </Card>
  );
}

/** Minimal server-rendered sparkline — no chart library needed. */
function Sparkline({ data }: { data: number[] }) {
  const w = 120;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - 2 - ((v - min) / range) * (h - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="mt-3 h-7 w-full text-muted-foreground/50"
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
