"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { retryAllFailedAction } from "@/app/actions/payroll";

export function RetryAllButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function run() {
    setBusy(true);
    try {
      const res = await retryAllFailedAction();
      if (res.retried) {
        toast.success(`Retried ${res.retried} payment${res.retried === 1 ? "" : "s"}`);
      }
      if (res.errors) {
        toast.error(res.error ?? `${res.errors} retr${res.errors === 1 ? "y" : "ies"} failed`);
      }
      if (!res.retried && !res.errors) toast.info("Nothing to retry");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" className="w-full" onClick={run} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <RefreshCw />} Retry all failed
    </Button>
  );
}
