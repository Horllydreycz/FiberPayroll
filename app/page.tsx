import Link from "next/link";
import {
  ArrowRight,
  Zap,
  Globe,
  ShieldCheck,
  FileText,
  Upload,
  Radio,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";

const FEATURES = [
  { icon: Upload, title: "Bulk CSV import", body: "Onboard hundreds of employees in one upload with validation and duplicate detection." },
  { icon: Zap, title: "Settle in minutes", body: "Batch stablecoin payments over Fiber's payment channels — not days of bank transfers." },
  { icon: Radio, title: "Live settlement tracking", body: "Watch every payment move from broadcast to settled, in real time." },
  { icon: Globe, title: "Pay anywhere", body: "RUSD, USDI and USDC to any wallet, in any country, with near-zero fees." },
  { icon: Receipt, title: "PDF payslips", body: "Auto-generated payslips with on-chain transaction proof and QR verification." },
  { icon: ShieldCheck, title: "Audit-ready", body: "Full audit log, accounting exports, and per-country reporting baked in." },
];

const STEPS = [
  "Upload your team via CSV",
  "Review & approve payroll",
  "Execute batch payments on Fiber",
  "Watch live settlement & export reports",
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost">
              <Link href="/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_50%_at_50%_0%,oklch(0.55_0.12_160/0.12),transparent)]" />
          <div className="mx-auto max-w-6xl px-4 py-20 text-center md:px-6 md:py-28">
            <Badge className="mb-5 gap-1.5">
              <Zap className="h-3.5 w-3.5" /> Built on Nervos CKB · Fiber Network
            </Badge>
            <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Global payroll in stablecoins,{" "}
              <span className="text-primary">completed in minutes</span>
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              Upload your team, approve a payroll run, and pay everyone worldwide in stablecoins
              over the Fiber Network — with live settlement tracking and audit-ready reports.
            </p>
            <div className="mt-8 flex items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/register">
                  Start free <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">View demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Demo login: admin@fiberpayroll.dev · password123
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y bg-muted/30">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
            {[
              ["< 5 min", "to run payroll"],
              ["500+", "employees per batch"],
              ["~$0.001", "network fee per payment"],
              ["100%", "settlement tracking"],
            ].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-3xl font-semibold tracking-tight">{n}</div>
                <div className="mt-1 text-sm text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6">
          <h2 className="text-center text-3xl font-semibold tracking-tight">
            Everything payroll needs, on-chain
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-xl border bg-card p-6 shadow-sm">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/30">
          <div className="mx-auto max-w-6xl px-4 py-20 md:px-6">
            <h2 className="text-center text-3xl font-semibold tracking-tight">
              From spreadsheet to settled in four steps
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {STEPS.map((step, i) => (
                <div key={step} className="relative rounded-xl border bg-card p-6">
                  <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {i + 1}
                  </div>
                  <p className="text-sm font-medium">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Button asChild size="lg">
                <Link href="/register">
                  Run your first payroll <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted-foreground md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" /> Fiber Payroll — hackathon MVP
          </div>
          <span>Powered by Nervos CKB & the Fiber Network</span>
        </div>
      </footer>
    </div>
  );
}
