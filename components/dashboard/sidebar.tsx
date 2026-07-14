"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
      <div className="flex h-[72px] items-center border-b px-5">
        <Link href="/dashboard">
          <Logo />
        </Link>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg border bg-card p-4">
        <div className="mb-1 flex items-center gap-1.5 text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5 text-muted-foreground" /> Powered by Fiber
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Instant settlement over Nervos CKB payment channels.
        </p>
      </div>
    </aside>
  );
}
