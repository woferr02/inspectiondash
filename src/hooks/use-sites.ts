"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listenSites } from "@/lib/firestore";
import type { Site } from "@/lib/types";

export function useSites() {
  const { profile } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenSites(
      profile.orgId,
      (data) => {
        setSites(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.orgId]);

  return { sites, loading, error };
}
