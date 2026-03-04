import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import type { KpiData } from "@/lib/types";
import Link from "next/link";

interface KpiCardProps extends KpiData {
  icon: LucideIcon;
  href?: string;
}

export function KpiCard({ label, value, change, trend, icon: Icon, href }: KpiCardProps) {
  const content = (
    <Card className={cn("transition-shadow hover:shadow-md", href && "cursor-pointer")}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
        </div>

        <div className="mt-3">
          <span className="text-3xl font-bold text-foreground tabular-nums">
            {value}
          </span>
        </div>

        {change !== 0 && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trend === "up" && change > 0 && "text-emerald-600",
              trend === "up" && change < 0 && "text-red-600",
              trend === "down" && "text-red-600",
              trend === "neutral" && "text-muted-foreground"
            )}
          >
            {trend === "up" ? (
              <TrendingUp className="h-3 w-3" />
            ) : trend === "down" ? (
              <TrendingDown className="h-3 w-3" />
            ) : (
              <Minus className="h-3 w-3" />
            )}
            <span>
              {change > 0 ? "+" : ""}
              {change}% vs last 30d
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}
