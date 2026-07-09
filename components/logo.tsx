import { cn } from "@/lib/utils";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
          <path d="M5 6h14M5 12h10M5 18h6" />
        </svg>
      </div>
      {showText && (
        <span className="text-[15px] font-semibold tracking-tight">
          Fiber<span className="text-primary">Payroll</span>
        </span>
      )}
    </div>
  );
}
