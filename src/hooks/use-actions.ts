"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { listenActions } from "@/lib/firestore";
import type { CorrectiveAction } from "@/lib/types";

export function useActions() {
  const { profile } = useAuth();
  const [actions, setActions] = useState<CorrectiveAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = listenActions(
      profile.orgId,
      (data) => {
        setActions(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [profile?.orgId]);

  return { actions, loading, error };
}
