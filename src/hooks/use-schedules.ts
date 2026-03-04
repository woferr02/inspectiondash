"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listenSchedules } from "@/lib/firestore";
import type { Schedule } from "@/lib/types";

export function useSchedules() {
  const { profile } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) return;

    const unsubscribe = listenSchedules(
      profile.orgId,
      (data) => {
        setSchedules(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.orgId]);

  return { schedules, loading, error };
}
