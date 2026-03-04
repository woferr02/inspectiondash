"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { routes } from "@/lib/constants";
import { useOrg } from "@/hooks/use-org";
import {
  LayoutDashboard,
  ClipboardCheck,
  MapPin,
  AlertTriangle,
  BarChart3,
  Users,
  Calendar,
  Settings,
  Shield,
  ScrollText,
  Search,
  ShieldAlert,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OrgRole } from "@/lib/types";

/** Minimum role required to see a nav item. "inspector" means everyone sees it. */
type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  minRole: OrgRole;
  /** When true, renders a subtle separator line ABOVE this item */
  separator?: boolean;
};

const ROLE_RANK: Record<OrgRole, number> = {
  inspector: 0,
  manager: 1,
  admin: 2,
};

export const navItems: NavItem[] = [
  // ── Daily Operations ──
  { label: "Overview", href: routes.dashboard, icon: LayoutDashboard, minRole: "inspector" },
  { label: "Inspections", href: routes.inspections, icon: ClipboardCheck, minRole: "inspector" },
  { label: "Sites", href: routes.sites, icon: MapPin, minRole: "inspector" },
  { label: "Actions", href: routes.actions, icon: AlertTriangle, minRole: "inspector" },
  { label: "Incidents", href: routes.incidents, icon: ShieldAlert, minRole: "inspector" },
  // ── Intelligence ──
  { label: "Findings", href: routes.findings, icon: Search, minRole: "manager", separator: true },
  { label: "Analytics", href: routes.analytics, icon: BarChart3, minRole: "manager" },
  // ── Configuration ──
  { label: "Schedules", href: routes.schedules, icon: Calendar, minRole: "manager", separator: true },
  { label: "Team", href: routes.team, icon: Users, minRole: "admin" },
  // ── Admin ──
  { label: "Audit Log", href: routes.auditLog, icon: ScrollText, minRole: "admin", separator: true },
  { label: "Settings", href: routes.settings, icon: Settings, minRole: "admin" },
];

function hasAccess(userRole: OrgRole | null | undefined, minRole: OrgRole): boolean {
  return ROLE_RANK[userRole ?? "inspector"] >= ROLE_RANK[minRole];
}

/* Shared nav link list – used by both desktop Sidebar and MobileSidebar */
export function NavLinks({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { currentUserRole } = useOrg();

  const visibleItems = useMemo(
    () => navItems.filter((item) => hasAccess(currentUserRole, item.minRole)),
    [currentUserRole]
  );

  return (
    <nav className="flex-1 px-2 py-4 overflow-y-auto">
      {visibleItems.map((item, idx) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        // Check if this item is the first visible one with a separator
        const showSep = item.separator && idx > 0;

        const linkContent = (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary focus-visible:ring-offset-1",
              isActive
                ? "bg-sidebar-primary text-white"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </Link>
        );

        const separator = showSep ? (
          <div className="my-2 mx-3 border-t border-sidebar-border/40" />
        ) : null;

        if (collapsed) {
          return (
            <div key={item.href}>
              {separator}
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            </div>
          );
        }

        return (
          <div key={item.href}>
            {separator}
            {linkContent}
          </div>
        );
      })}
    </nav>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "hidden lg:flex flex-col bg-sidebar text-sidebar-foreground transition-all duration-200",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-white">
          <Shield className="h-4 w-4" />
        </div>
        {!collapsed && (
          <span className="text-sm font-semibold text-white truncate">
            SafeCheck Pro
          </span>
        )}
      </div>

      <NavLinks collapsed={collapsed} />

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex items-center justify-center h-10 border-t border-sidebar-border text-sidebar-foreground hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-primary"
      >
        {collapsed ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
