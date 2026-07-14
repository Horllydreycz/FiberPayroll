import { formatCkb } from "@/lib/utils";

/**
 * Flagship treasury card — deep emerald gradient with a drifting inner glow,
 * live-node indicator, headline balance and an in-card stats footer.
 * Structure and values lifted from the design prototype.
 */
export function TreasuryHero({
  totalCkb,
  usd,
  channelCkb,
  onchainCkb,
  avgSettle,
  live,
  nodeOk,
  alert,
}: {
  totalCkb: number;
  usd: string | null;
  channelCkb: number;
  onchainCkb: number;
  avgSettle: string | null;
  live: boolean;
  /** Whether the Fiber node actually responded (badge honesty). */
  nodeOk: boolean;
  alert?: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] p-6 text-white sm:px-7"
      style={{
        background:
          "linear-gradient(135deg, oklch(0.47 0.1 162) 0%, oklch(0.43 0.085 178) 48%, oklch(0.4 0.07 198) 100%)",
        boxShadow: "0 24px 55px -22px oklch(0.45 0.09 170 / 0.6)",
      }}
    >
      {/* drifting inner glow */}
      <div
        aria-hidden
        className="absolute rounded-full"
        style={{
          width: 280,
          height: 280,
          right: -70,
          top: -90,
          background: "radial-gradient(circle, oklch(0.7 0.13 160 / 0.55), transparent 70%)",
          animation: "fp-drift 9s ease-in-out infinite",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium opacity-80">Treasury balance</span>
          {live && nodeOk && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold">
              <span className="relative h-1.5 w-1.5">
                <span
                  className="absolute inset-0 rounded-full"
                  style={{ background: "oklch(0.85 0.15 155)", animation: "fp-ping 1.8s ease-out infinite" }}
                />
                <span className="absolute inset-0 rounded-full" style={{ background: "oklch(0.9 0.12 155)" }} />
              </span>
              Live node
            </span>
          )}
          {live && !nodeOk && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11.5px] font-semibold text-amber-200">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              Node offline
            </span>
          )}
        </div>

        <div className="mt-3.5 flex items-baseline gap-2.5">
          <span className="font-mono text-[42px] font-bold leading-none tracking-tight">
            {new Intl.NumberFormat("en-US", {
              maximumFractionDigits: totalCkb >= 10_000 ? 0 : 2,
            }).format(totalCkb)}
          </span>
          <span className="text-base font-semibold opacity-85">CKB</span>
          {usd && <span className="ml-auto font-mono text-[13.5px] opacity-80">{usd}</span>}
        </div>

        <div className="mt-5 flex gap-6 border-t border-white/15 pt-4">
          <div>
            <p className="text-[11.5px] opacity-75">In channels</p>
            <p className="mt-0.5 font-mono text-base font-semibold">{formatCkb(channelCkb)}</p>
          </div>
          <div>
            <p className="text-[11.5px] opacity-75">On-chain</p>
            <p className="mt-0.5 font-mono text-base font-semibold">{formatCkb(onchainCkb)}</p>
          </div>
          {avgSettle && (
            <div className="ml-auto text-right">
              <p className="text-[11.5px] opacity-75">Avg settlement</p>
              <p className="mt-0.5 font-mono text-base font-semibold">{avgSettle}</p>
            </div>
          )}
        </div>

        {alert && (
          <p className="mt-3 rounded-lg bg-white/10 px-3 py-2 text-xs font-medium text-amber-200">
            {alert}
          </p>
        )}
      </div>
    </div>
  );
}
