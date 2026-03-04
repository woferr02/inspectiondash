"use client";

import { useEffect, useState, useCallback } from "react";
import { doc, getDoc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Organization, OrgMember } from "@/lib/types";

export function useOrg() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orgId = profile?.orgId;

  // Fetch org document once (doesn't change often)
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const fetchOrg = async () => {
      try {
        const orgDoc = await getDoc(doc(db, "organizations", orgId));
        if (orgDoc.exists()) {
          setOrg({ id: orgDoc.id, ...orgDoc.data() } as Organization);
        }
      } catch (err) {
        console.error("Failed to fetch organization:", err);
        setError(err instanceof Error ? err.message : "Failed to load organization");
      }
    };

    fetchOrg();
  }, [orgId]);

  // Real-time members listener — picks up invites/removals/role changes immediately
  useEffect(() => {
    if (!orgId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, "organizations", orgId, "members"),
      (snapshot) => {
        const membersList = snapshot.docs.map(
          (d) => ({ userId: d.id, ...d.data() } as OrgMember)
        );
        setMembers(membersList);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to listen to members:", err);
        setError(err.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [orgId]);

  /** Current user's role within the organization. */
  const currentUserRole = profile
    ? members.find((m) => m.userId === profile.uid)?.role ?? null
    : null;

  const isAdmin = currentUserRole === "admin";

  return { org, members, loading, error, currentUserRole, isAdmin, orgId };
}
