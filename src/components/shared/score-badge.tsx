import { cn, scoreBgColor, formatPercent } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ScoreBadgeProps {
  score: number | null;
  className?: string;
}

export function ScoreBadge({ score, className }: ScoreBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "font-semibold tabular-nums text-xs px-2 py-0.5",
        scoreBgColor(score),
        className
      )}
    >
      {formatPercent(score)}
    </Badge>
  );
}
