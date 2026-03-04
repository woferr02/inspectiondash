import { cn, inspectionStatusColor, inspectionStatusLabel, actionStatusColor, actionStatusLabel, severityColor, severityLabel } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { InspectionStatus, ActionStatus, ActionSeverity } from "@/lib/types";

interface InspectionStatusBadgeProps {
  status: InspectionStatus;
  className?: string;
}

export function InspectionStatusBadge({ status, className }: InspectionStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs px-2 py-0.5 font-medium", inspectionStatusColor(status), className)}
    >
      {inspectionStatusLabel(status)}
    </Badge>
  );
}

interface ActionStatusBadgeProps {
  status: ActionStatus;
  className?: string;
}

export function ActionStatusBadge({ status, className }: ActionStatusBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs px-2 py-0.5 font-medium", actionStatusColor(status), className)}
    >
      {actionStatusLabel(status)}
    </Badge>
  );
}

interface SeverityBadgeProps {
  severity: ActionSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className }: SeverityBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn("text-xs px-2 py-0.5 font-medium", severityColor(severity), className)}
    >
      {severityLabel(severity)}
    </Badge>
  );
}
