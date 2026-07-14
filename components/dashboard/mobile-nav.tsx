"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Radio,
  MoreHorizontal,
  BarChart3,
  Sparkles,
  Bell,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

import type { LucideIcon } from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

// Primary tabs (always visible) + overflow items (behind "More").
const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/employees", label: "Team", icon: Users },
  { href: "/dashboard/payroll", label: "Payroll", icon: Wallet },
  { href: "/dashboard/settlements", label: "Settle", icon: Radio },
];

const MORE: NavItem[] = [
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "Assistant", icon: Sparkles },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/**
 * Mobile bottom tab bar (design option 1D). Persistent tabs with an accent
 * pill on the active one; a "More" tab expands a sheet for the rest.
 * Hidden at md and up, where the desktop sidebar takes over.
 */
export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);

  React.useEffect(() => setMoreOpen(false), [pathname]);

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);
  const moreActive = MORE.some((m) => pathname.startsWith(m.href));

  return (
    <div className="md:hidden">
      {/* More sheet + backdrop */}
      {moreOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" />
          <div
            className="absolute inset-x-3 bottom-[84px] rounded-[20px] border bg-card p-2 shadow-[0_16px_40px_-18px_oklch(0.3_0.02_160/0.5)]"
            onClick={(e) => e.stopPropagation()}
          >
            {MORE.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  pathname.startsWith(href)
                    ? "bg-accent font-medium text-foreground"
                    : "text-foreground/80 hover:bg-accent/60",
                )}
              >
                <Icon className="h-[18px] w-[18px] text-primary" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-[76px] items-start border-t bg-background/90 px-2 pt-2.5 backdrop-blur-md">
        {PRIMARY.map(({ href, label, icon: Icon, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-1.5",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "rounded-full px-4 py-1 transition-colors",
                  active && "bg-primary/12",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className={cn("text-[10px]", active && "font-semibold")}>{label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-1.5",
            moreActive || moreOpen ? "text-primary" : "text-muted-foreground",
          )}
        >
          <span
            className={cn(
              "rounded-full px-4 py-1 transition-colors",
              (moreActive || moreOpen) && "bg-primary/12",
            )}
          >
            <MoreHorizontal className="h-5 w-5" />
          </span>
          <span className={cn("text-[10px]", (moreActive || moreOpen) && "font-semibold")}>
            More
          </span>
        </button>
      </nav>
    </div>
  );
}
