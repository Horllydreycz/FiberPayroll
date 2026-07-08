import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

const MAP: Record<string, { label: string; variant: Variant; dot?: string }> = {
  // Batch
  DRAFT: { label: "Draft", variant: "muted" },
  APPROVED: { label: "Approved", variant: "default" },
  PROCESSING: { label: "Processing", variant: "warning", dot: "bg-warning" },
  COMPLETED: { label: "Completed", variant: "success" },
  FAILED: { label: "Failed", variant: "destructive" },
  CANCELLED: { label: "Cancelled", variant: "muted" },
  // Item / payment
  PENDING: { label: "Pending", variant: "muted" },
  BROADCASTING: { label: "Broadcasting", variant: "warning", dot: "bg-warning" },
  SETTLED: { label: "Settled", variant: "success" },
  EXPIRED: { label: "Expired", variant: "muted" },
  REFUNDED: { label: "Refunded", variant: "secondary" },
  CREATED: { label: "Created", variant: "muted" },
  INFLIGHT: { label: "In flight", variant: "warning", dot: "bg-warning" },
  SUCCESS: { label: "Success", variant: "success" },
  // Employee
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "muted" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const cfg = MAP[status] ?? { label: status, variant: "secondary" as Variant };
  const animate = status === "PROCESSING" || status === "BROADCASTING" || status === "INFLIGHT";
  return (
    <Badge variant={cfg.variant} className={cn("font-medium", className)}>
      {cfg.dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot, animate && "animate-pulse")} />
      )}
      {cfg.label}
    </Badge>
  );
}
