import Link from "next/link";
import { Bell, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/dashboard/user-menu";
import { Badge } from "@/components/ui/badge";

export function Topbar({
  user,
  unread,
}: {
  user: { name: string; email: string; role: string };
  unread: number;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <div className="md:hidden">
        <Logo showText={false} />
      </div>

      <div className="ml-auto flex items-center gap-1.5">
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link href="/dashboard/payroll/new">
            <Plus /> New payroll
          </Link>
        </Button>

        <Button asChild variant="ghost" size="icon" className="relative">
          <Link href="/dashboard/notifications" aria-label="Notifications">
            <Bell />
            {unread > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-0.5 -top-0.5 h-4 min-w-4 justify-center px-1 text-[10px]"
              >
                {unread}
              </Badge>
            )}
          </Link>
        </Button>

        <ThemeToggle />
        <UserMenu name={user.name} email={user.email} role={user.role} />
      </div>
    </header>
  );
}
