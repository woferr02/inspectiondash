"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Reports merged into Analytics - redirect for old bookmarks */
export default function ReportsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/analytics");
  }, [router]);
  return null;
}