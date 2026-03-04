"use client";

import { useEffect, useState } from "react";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import type { Organization, OrgMember } from "@/lib/types";

export function useOrg() {
  const { profile } = useAuth();
  const [org, setOrg] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.orgId) {
      setLoading(false);
      return;
    }

    const fetchOrg = async () => {
      try {
        const orgDoc = await getDoc(doc(db, "organizations", profile.orgId));
        if (orgDoc.exists()) {
          setOrg({ id: orgDoc.id, ...orgDoc.data() } as Organization);
        }

        const membersSnap = await getDocs(
          collection(db, "organizations", profile.orgId, "members")
        );
        const membersList = membersSnap.docs.map(
          (d) => ({ userId: d.id, ...d.data() } as OrgMember)
        );
        setMembers(membersList);
      } catch (err) {
        console.error("Failed to fetch organization data:", err);
        setError(err instanceof Error ? err.message : "Failed to load organization");
      } finally {
        setLoading(false);
      }
    };

    fetchOrg();
  }, [profile?.orgId]);

  return { org, members, loading, error };
}
