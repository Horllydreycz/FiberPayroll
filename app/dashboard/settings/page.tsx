import { Radio, KeyRound, Webhook, Building2 } from "lucide-react";
import { requireUser } from "@/lib/session";
import { fiber } from "@/lib/fiber";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SettingsForm } from "@/components/settings/settings-form";

export default async function SettingsPage() {
  const user = await requireUser();
  const company = user.company;
  const status = await fiber().ping();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Manage your company, payments and developer access." />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Company
            </CardTitle>
            <CardDescription>Branding and default payment preferences.</CardDescription>
          </CardHeader>
          <CardContent>
            <SettingsForm
              initial={{
                name: company.name,
                defaultCurrency: company.defaultCurrency,
                defaultStablecoin: company.defaultStablecoin,
                timezone: company.timezone,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Radio className="h-4 w-4" /> Fiber Network
            </CardTitle>
            <CardDescription>Connection used to send stablecoin payments.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="text-sm font-medium">Adapter mode</p>
                <p className="text-xs text-muted-foreground">{status.detail}</p>
              </div>
              <Badge variant={status.ok ? "success" : "destructive"}>
                <span className={`h-1.5 w-1.5 rounded-full ${status.ok ? "bg-success" : "bg-destructive"}`} />
                {status.mode === "simulated" ? "Simulated" : status.ok ? "Connected" : "Offline"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Set <code className="rounded bg-muted px-1">FIBER_MODE=rpc</code> and{" "}
              <code className="rounded bg-muted px-1">FIBER_RPC_URL</code> in your environment to
              settle against a live Fiber node.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> Developer
            </CardTitle>
            <CardDescription>API keys and webhooks (demo placeholders).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>API key</Label>
              <Input readOnly value={`fpk_live_${company.id.slice(0, 24)}`} className="font-mono text-xs" />
            </div>
            <Separator />
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Webhook className="h-3.5 w-3.5" /> Webhook URL
              </Label>
              <Input placeholder="https://your-app.com/webhooks/fiber" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
