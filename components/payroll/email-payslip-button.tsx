"use client";

import * as React from "react";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { emailPayslipAction } from "@/app/actions/payslip";

export function EmailPayslipButton({ itemId, email }: { itemId: string; email: string }) {
  const [busy, setBusy] = React.useState(false);

  async function send() {
    setBusy(true);
    try {
      const res = await emailPayslipAction(itemId);
      if (res.ok) toast.success(`Payslip emailed to ${email}`);
      else toast.error(res.error ?? "Could not send");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="outline" onClick={send} disabled={busy}>
      {busy ? <Loader2 className="animate-spin" /> : <Mail />} Email payslip
    </Button>
  );
}
