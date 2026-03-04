"use client";

import { useMemo, useState } from "react";
import { useActions } from "@/hooks/use-actions";
import { useSchedules } from "@/hooks/use-schedules";
import { useInspections } from "@/hooks/use-inspections";
import { useSites } from "@/hooks/use-sites";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  AlertTriangle,
  Calendar,
  TrendingDown,
  ClipboardCheck,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { isPast, isToday, parseISO, differenceInDays, format } from "date-fns";

type NotificationType = "overdue-action" | "overdue-schedule" | "low-score" | "unresolved-critical";

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  href: string;
  severity: "critical" | "warning" | "info";
  timestamp?: string;
}

function getIcon(type: NotificationType) {
  switch (type) {
    case "overdue-action": return <Clock className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
    case "overdue-schedule": return <Calendar className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />;
    case "low-score": return <TrendingDown className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />;
    case "unresolved-critical": return <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />;
  }
}

export function NotificationCenter() {
  const { actions } = useActions();
  const { schedules } = useSchedules();
  const { inspections } = useInspections();
  const { sites } = useSites();
  const [open, setOpen] = useState(false);

  const siteMap = useMemo(() => new Map(sites.map((s) => [s.id, s.name])), [sites]);

  const notifications = useMemo<Notification[]>(() => {
    const items: Notification[] = [];

    // 1. Overdue corrective actions
    const overdueActions = actions.filter(
      (a) => (a.status === "open" || a.status === "inProgress") &&
        a.dueDate && isPast(parseISO(a.dueDate)) && !isToday(parseISO(a.dueDate))
    );
    for (const a of overdueActions.slice(0, 10)) {
      const daysOverdue = differenceInDays(new Date(), parseISO(a.dueDate!));
      items.push({
        id: `action-${a.id}`,
        type: "overdue-action",
        title: a.title,
        description: `Overdue by ${daysOverdue} day${daysOverdue !== 1 ? "s" : ""} — ${a.assignee || "Unassigned"}`,
        href: "/actions",
        severity: daysOverdue > 14 ? "critical" : "warning",
        timestamp: a.dueDate!,
      });
    }

    // 2. Unresolved critical/high severity actions
    const criticalOpen = actions.filter(
      (a) => (a.status === "open") && (a.severity === "critical" || a.severity === "high")
    );
    for (const a of criticalOpen.slice(0, 5)) {
      // Don't duplicate if already in overdue
      if (overdueActions.find((o) => o.id === a.id)) continue;
      items.push({
        id: `critical-${a.id}`,
        type: "unresolved-critical",
        title: a.title,
        description: `${a.severity.toUpperCase()} severity — open since ${format(parseISO(a.createdAt), "MMM d")}`,
        href: "/actions",
        severity: "critical",
        timestamp: a.createdAt,
      });
    }

    // 3. Overdue schedules
    const overdueSchedules = schedules.filter((s) => {
      if (s.isActive === false) return false;
      try { return isPast(parseISO(s.nextDue)) && !isToday(parseISO(s.nextDue)); }
      catch { return false; }
    });
    for (const s of overdueSchedules.slice(0, 5)) {
      const siteName = s.siteName ?? siteMap.get(s.siteId) ?? s.siteId;
      const daysOverdue = differenceInDays(new Date(), parseISO(s.nextDue));
      items.push({
        id: `schedule-${s.id}`,
        type: "overdue-schedule",
        title: s.templateName ?? s.templateId,
        description: `${daysOverdue}d overdue at ${siteName}`,
        href: "/schedules",
        severity: daysOverdue > 7 ? "critical" : "warning",
        timestamp: s.nextDue,
      });
    }

    // 4. Recent low-score inspections (last 7 days, score < 70)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const lowScoreInspections = inspections.filter(
      (i) => i.score !== null && i.score < 70 && new Date(i.date) >= sevenDaysAgo
    );
    for (const i of lowScoreInspections.slice(0, 5)) {
      items.push({
        id: `lowscore-${i.id}`,
        type: "low-score",
        title: `${i.name} — ${i.score}%`,
        description: `${i.siteName || "Unknown site"} on ${format(parseISO(i.date), "MMM d")}`,
        href: `/inspections/${i.id}`,
        severity: (i.score ?? 0) < 50 ? "critical" : "warning",
        timestamp: i.date,
      });
    }

    // Sort: critical first, then by timestamp
    items.sort((a, b) => {
      const sevOrder = { critical: 0, warning: 1, info: 2 };
      if (sevOrder[a.severity] !== sevOrder[b.severity]) {
        return sevOrder[a.severity] - sevOrder[b.severity];
      }
      return (b.timestamp ?? "").localeCompare(a.timestamp ?? "");
    });

    return items;
  }, [actions, schedules, inspections, siteMap]);

  const criticalCount = notifications.filter((n) => n.severity === "critical").length;
  const totalCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground"
          aria-label={`${totalCount} notification${totalCount !== 1 ? "s" : ""}`}
        >
          <Bell className="h-5 w-5" />
          {totalCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
                criticalCount > 0 ? "bg-red-500 animate-pulse" : "bg-amber-500"
              )}
            >
              {totalCount > 99 ? "99+" : totalCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0 max-h-[70vh] overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {totalCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {totalCount}
              </Badge>
            )}
          </div>
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {criticalCount} critical
            </Badge>
          )}
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-56px)]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p className="text-sm">All clear — no issues to report</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors",
                    n.severity === "critical" && "bg-red-50/50 dark:bg-red-950/10"
                  )}
                >
                  {getIcon(n.type)}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {n.description}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-2 text-center">
              <Link
                href="/actions"
                onClick={() => setOpen(false)}
                className="text-xs text-primary hover:underline"
              >
                View all actions →
              </Link>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
