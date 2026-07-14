"use server";

// Payroll assistant — answers natural-language questions from the company's
// REAL data. Deliberately rule-based (no external LLM): deterministic,
// offline-safe, and every number is queried live from the database/node.

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getTreasury } from "@/lib/fiber/service";
import { ckbEquivalent } from "@/lib/constants";
import { getCkbPerUsd, getCkbUsdPrice, approxUsd } from "@/lib/price";
import { formatCkb } from "@/lib/utils";

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

export async function askAssistant(question: string): Promise<string> {
  const user = await requireUser();
  const companyId = user.companyId;
  const q = question.toLowerCase();
  const rate = await getCkbPerUsd();
  const now = new Date();
  const thisMonth = monthKey(now);

  const settled = await prisma.payment.findMany({
    where: { status: "SUCCESS", payrollItem: { batch: { companyId } } },
    select: {
      amount: true,
      stablecoin: true,
      payrollItem: { select: { batch: { select: { payrollMonth: true } } } },
    },
  });
  const totalFor = (m: string) =>
    settled
      .filter((p) => p.payrollItem.batch.payrollMonth === m)
      .reduce((s, p) => s + ckbEquivalent(p.amount, p.stablecoin, rate), 0);

  // ── Treasury / balance ──
  if (/balance|treasury|liquidity|afford|channel/.test(q)) {
    const t = await getTreasury(companyId);
    if (!t.live) return `The treasury (simulated mode) holds ${t.balance.toFixed(2)} ${t.stablecoin}.`;
    const usd = approxUsd(t.totalCkb, await getCkbUsdPrice());
    return (
      `The treasury holds ${formatCkb(t.totalCkb)}${usd ? ` (${usd})` : ""} — ` +
      `${formatCkb(t.channelCkb)} spendable in channels and ${formatCkb(t.onchainCkb)} on-chain. ` +
      (t.nodeOk ? "The Fiber node is live." : "⚠ The Fiber node is currently unreachable.")
    );
  }

  // ── Unpaid / failed ──
  if (/unpaid|hasn't been paid|not been paid|haven'?t.*paid|failed|owe/.test(q)) {
    const open = await prisma.payrollItem.findMany({
      where: { batch: { companyId }, status: { in: ["FAILED", "PENDING", "PROCESSING", "BROADCASTING"] } },
      include: { employee: { select: { fullName: true } }, batch: { select: { reference: true } } },
      take: 20,
    });
    if (!open.length) return "Everyone is paid — no failed or pending payments right now. ✅";
    const lines = open.map(
      (it) => `• ${it.employee.fullName} — ${formatCkb(ckbEquivalent(it.stablecoinAmount, it.stablecoin, rate))} (${it.status.toLowerCase()}, ${it.batch.reference})`,
    );
    const failed = open.filter((i) => i.status === "FAILED").length;
    return (
      `${open.length} payment${open.length === 1 ? " is" : "s are"} outstanding` +
      (failed ? ` (${failed} failed — retryable)` : "") +
      `:\n${lines.join("\n")}`
    );
  }

  // ── Unusual changes ──
  if (/unusual|change|anomal|spike|drop/.test(q)) {
    const items = await prisma.payrollItem.findMany({
      where: { batch: { companyId }, status: "SETTLED" },
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { employee: { select: { fullName: true } } },
    });
    const byEmp = new Map<string, number[]>();
    for (const it of items) {
      const arr = byEmp.get(it.employee.fullName) ?? [];
      if (arr.length < 2) arr.push(ckbEquivalent(it.stablecoinAmount, it.stablecoin, rate));
      byEmp.set(it.employee.fullName, arr);
    }
    const changes: string[] = [];
    for (const [name, [latest, prev]] of byEmp) {
      if (prev && prev > 0) {
        const pct = ((latest - prev) / prev) * 100;
        if (Math.abs(pct) >= 20) {
          changes.push(`• ${name}: ${pct > 0 ? "+" : ""}${pct.toFixed(0)}% (${formatCkb(prev)} → ${formatCkb(latest)})`);
        }
      }
    }
    return changes.length
      ? `Salary changes of 20%+ between the last two paid runs:\n${changes.join("\n")}`
      : "No unusual salary changes — everyone's last two payments are within 20% of each other.";
  }

  // ── Forecast ──
  if (/predict|forecast|next month|expect|estimate/.test(q)) {
    const last3 = [3, 2, 1].map((i) => totalFor(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1))));
    const withData = last3.filter((v) => v > 0);
    const active = await prisma.employee.count({ where: { companyId, status: "ACTIVE" } });
    if (!withData.length) {
      return `Not enough history to forecast yet — run a few payrolls first. You currently have ${active} active employee${active === 1 ? "" : "s"}.`;
    }
    const avg = withData.reduce((a, b) => a + b, 0) / withData.length;
    const t = await getTreasury(companyId);
    const covers = t.live ? (t.channelCkb >= avg ? "current channel liquidity covers it" : `channel liquidity is ${formatCkb(avg - t.channelCkb)} short`) : null;
    return (
      `Based on the last ${withData.length} month${withData.length === 1 ? "" : "s"}, expect roughly ${formatCkb(avg)} next month for ${active} active employee${active === 1 ? "" : "s"}` +
      (covers ? ` — ${covers}.` : ".")
    );
  }

  // ── Paid this month / totals ──
  if (/month|paying|paid|total|spent|cost/.test(q)) {
    const monthTotal = totalFor(thisMonth);
    const count = settled.filter((p) => p.payrollItem.batch.payrollMonth === thisMonth).length;
    const pendingRuns = await prisma.payrollBatch.count({
      where: { companyId, status: { in: ["DRAFT", "APPROVED"] } },
    });
    const allTime = settled.reduce((s, p) => s + ckbEquivalent(p.amount, p.stablecoin, rate), 0);
    return (
      `This month (${thisMonth}) you've paid ${formatCkb(monthTotal)} across ${count} settled payment${count === 1 ? "" : "s"}. ` +
      `All-time: ${formatCkb(allTime)}.` +
      (pendingRuns ? ` ${pendingRuns} run${pendingRuns === 1 ? "" : "s"} still awaiting action.` : "")
    );
  }

  // ── Summary ──
  if (/summary|overview|report|how are we|status/.test(q)) {
    const [active, batches, items] = await Promise.all([
      prisma.employee.count({ where: { companyId, status: "ACTIVE" } }),
      prisma.payrollBatch.count({ where: { companyId } }),
      prisma.payrollItem.findMany({ where: { batch: { companyId } }, select: { status: true } }),
    ]);
    const settledCount = items.filter((i) => i.status === "SETTLED").length;
    const rateStr = items.length ? `${Math.round((settledCount / items.length) * 100)}%` : "—";
    const allTime = settled.reduce((s, p) => s + ckbEquivalent(p.amount, p.stablecoin, rate), 0);
    return (
      `Payroll summary for ${user.company.name}: ${active} active employees, ${batches} runs, ` +
      `${formatCkb(allTime)} paid all-time over Fiber, ${rateStr} settlement rate (${settledCount}/${items.length} payments), ` +
      `${formatCkb(totalFor(thisMonth))} paid this month.`
    );
  }

  return (
    "I can answer questions about your payroll data. Try:\n" +
    "• How much are we paying this month?\n" +
    "• Which employees haven't been paid?\n" +
    "• What's our treasury balance?\n" +
    "• Highlight unusual salary changes\n" +
    "• Predict next month's payroll expenses\n" +
    "• Give me a payroll summary"
  );
}
