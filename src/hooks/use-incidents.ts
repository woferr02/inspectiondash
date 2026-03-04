"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listenIncidents } from "@/lib/firestore";
import type { Incident } from "@/lib/types";

export function useIncidents() {
  const { profile } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = listenIncidents(
      profile.orgId,
      (data) => {
        setIncidents(data);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return unsub;
  }, [profile?.orgId]);

  return { incidents, loading };
}
