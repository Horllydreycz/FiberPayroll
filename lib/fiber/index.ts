import { RpcFiberAdapter } from "./rpc";
import { SimulatedFiberAdapter } from "./simulated";
import type { FiberAdapter } from "./types";

let adapter: FiberAdapter | null = null;

/** Returns the configured Fiber adapter (singleton). */
export function fiber(): FiberAdapter {
  if (adapter) return adapter;
  const mode = (process.env.FIBER_MODE ?? "simulated").toLowerCase();
  adapter = mode === "rpc" ? new RpcFiberAdapter() : new SimulatedFiberAdapter();
  return adapter;
}

export * from "./types";
