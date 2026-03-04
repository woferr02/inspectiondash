"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listenInspections } from "@/lib/firestore";
import type { Inspection } from "@/lib/types";

export function useInspections() {
  const { profile } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenInspections(
      profile.orgId,
      (data) => {
        setInspections(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.orgId]);

  return { inspections, loading, error };
}
