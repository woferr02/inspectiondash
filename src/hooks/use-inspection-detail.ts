"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { getInspectionById, getInspectionAnswers } from "@/lib/firestore";
import type { Inspection, InspectionAnswer } from "@/lib/types";

export function useInspectionDetail(inspectionId: string) {
  const { profile } = useAuth();
  const [inspection, setInspection] = useState<Inspection | null>(null);
  const [answers, setAnswers] = useState<InspectionAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId || !inspectionId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        const [insp, ans] = await Promise.all([
          getInspectionById(profile.orgId, inspectionId),
          getInspectionAnswers(profile.orgId, inspectionId),
        ]);

        if (cancelled) return;

        setInspection(insp);
        setAnswers(ans);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load inspection"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [profile?.orgId, inspectionId]);

  return { inspection, answers, loading, error };
}
