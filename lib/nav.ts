import {
  LayoutDashboard,
  Users,
  Wallet,
  Radio,
  BarChart3,
  Bell,
  Settings,
  Sparkles,
} from "lucide-react";

/** Shared dashboard navigation — used by the sidebar and the mobile drawer. */
export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/employees", label: "Employees", icon: Users },
  { href: "/dashboard/payroll", label: "Payroll", icon: Wallet },
  { href: "/dashboard/settlements", label: "Settlements", icon: Radio },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/assistant", label: "Assistant", icon: Sparkles },
  { href: "/dashboard/notifications", label: "Notifications", icon: Bell },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
] as const;
