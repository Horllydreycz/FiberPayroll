import { revalidatePath } from "next/cache";
import { CheckCircle2, AlertTriangle, XCircle, Info, BellOff } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCompanyId } from "@/lib/session";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const ICONS = {
  success: { icon: CheckCircle2, cls: "text-success bg-success/12" },
  warning: { icon: AlertTriangle, cls: "text-warning bg-warning/15" },
  error: { icon: XCircle, cls: "text-destructive bg-destructive/12" },
  info: { icon: Info, cls: "text-primary bg-primary/10" },
} as const;

export default async function NotificationsPage() {
  const companyId = await requireCompanyId();
  const notifications = await prisma.notification.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  async function markAllRead() {
    "use server";
    const id = await requireCompanyId();
    await prisma.notification.updateMany({ where: { companyId: id, read: false }, data: { read: true } });
    revalidatePath("/dashboard/notifications");
  }

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader title="Notifications" description="Activity across your payroll workspace.">
        {unread > 0 && (
          <form action={markAllRead}>
            <Button variant="outline" type="submit">
              Mark all read
            </Button>
          </form>
        )}
      </PageHeader>

      <Card className="divide-y">
        {notifications.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16 text-center">
            <BellOff className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No notifications yet.</p>
          </div>
        )}
        {notifications.map((n) => {
          const cfg = ICONS[(n.type as keyof typeof ICONS) ?? "info"] ?? ICONS.info;
          const Icon = cfg.icon;
          return (
            <div key={n.id} className={cn("flex items-start gap-3 p-4", !n.read && "bg-primary/[0.03]")}>
              <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", cfg.cls)}>
                <Icon className="h-[18px] w-[18px]" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{n.title}</p>
                {n.body && <p className="text-sm text-muted-foreground">{n.body}</p>}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDate(n.createdAt, true)}</span>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
