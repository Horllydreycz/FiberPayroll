"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateCompany } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { STABLECOINS, FIAT_CURRENCIES } from "@/lib/constants";

export function SettingsForm({
  initial,
}: {
  initial: { name: string; defaultCurrency: string; defaultStablecoin: string; timezone: string };
}) {
  const [form, setForm] = React.useState(initial);
  const [pending, setPending] = React.useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setPending(true);
    try {
      await updateCompany(form);
      toast.success("Settings saved");
    } catch {
      toast.error("Could not save settings");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Company name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Default currency</Label>
          <Select value={form.defaultCurrency} onValueChange={(v) => set("defaultCurrency", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FIAT_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Default stablecoin</Label>
          <Select value={form.defaultStablecoin} onValueChange={(v) => set("defaultStablecoin", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STABLECOINS.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Timezone</Label>
          <Input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
        </div>
      </div>
      <Button onClick={save} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Save changes
      </Button>
    </div>
  );
}
