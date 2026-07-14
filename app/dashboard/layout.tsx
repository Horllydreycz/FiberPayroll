import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { MobileNav } from "@/components/dashboard/mobile-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const unread = await prisma.notification.count({
    where: { companyId: user.companyId, read: false },
  });

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={{ name: user.name, email: user.email, role: user.role }}
          unread={unread}
        />
        <main className="relative flex-1 overflow-hidden p-4 pb-24 md:p-6 md:pb-6 lg:px-12 lg:py-8">
          {/* Ambient mesh gradient field — light mode only */}
          <div aria-hidden className="absolute inset-0 -z-10 dark:hidden">
            <div
              className="mesh-blob"
              style={{
                width: 560,
                height: 560,
                left: -140,
                top: -180,
                background: "radial-gradient(circle, oklch(0.85 0.09 162 / 0.5), transparent 70%)",
              }}
            />
            <div
              className="mesh-blob"
              style={{
                width: 500,
                height: 500,
                right: -140,
                top: 20,
                background: "radial-gradient(circle, oklch(0.85 0.08 205 / 0.45), transparent 70%)",
                animationDelay: "-6s",
              }}
            />
            <div
              className="mesh-blob"
              style={{
                width: 460,
                height: 460,
                left: "40%",
                bottom: -220,
                background: "radial-gradient(circle, oklch(0.88 0.07 130 / 0.4), transparent 70%)",
                animationDelay: "-12s",
              }}
            />
          </div>
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
