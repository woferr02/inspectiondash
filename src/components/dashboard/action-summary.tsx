"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { EmptyState } from "@/components/shared/empty-state";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface ActionSummaryProps {
  data: {
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
    overdue: number;
    total: number;
  };
}

const COLORS = {
  Open: "#EF4444",
  "In Progress": "#F59E0B",
  Resolved: "#10B981",
  Closed: "#94A3B8",
};

export function ActionSummary({ data }: ActionSummaryProps) {
  const chartData = [
    { name: "Open", value: data.open },
    { name: "In Progress", value: data.inProgress },
    { name: "Resolved", value: data.resolved },
    { name: "Closed", value: data.closed },
  ].filter((d) => d.value > 0);

  if (data.total === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Corrective Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            icon={<AlertTriangle className="h-10 w-10" />}
            title="No actions yet"
            description="Corrective actions created in the app will appear here."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">Corrective Actions</CardTitle>
          {data.overdue > 0 && (
            <p className="text-xs text-red-600 font-medium mt-1">
              {data.overdue} overdue
            </p>
          )}
        </div>
        <Link
          href="/actions"
          className="text-xs font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.name}
                  fill={COLORS[entry.name as keyof typeof COLORS]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                fontSize: "12px",
                color: "var(--card-foreground)",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary numbers */}
        <div className="mt-2 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-muted p-2">
            <div className="text-lg font-bold text-foreground tabular-nums">
              {data.open + data.inProgress}
            </div>
            <div className="text-[11px] text-muted-foreground">Active</div>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <div className="text-lg font-bold text-foreground tabular-nums">
              {data.resolved + data.closed}
            </div>
            <div className="text-[11px] text-muted-foreground">Resolved</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
