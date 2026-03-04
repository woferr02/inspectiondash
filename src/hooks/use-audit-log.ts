"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listenAuditLog } from "@/lib/firestore";
import type { AuditEntry } from "@/lib/types";

export function useAuditLog(limitCount = 200) {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenAuditLog(
      profile.orgId,
      (data) => {
        setEntries(data);
        setLoading(false);
      },
      limitCount,
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.orgId, limitCount]);

  return { entries, loading, error };
}
