"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Templates merged into Analytics - redirect for old bookmarks */
export default function TemplatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/analytics");
  }, [router]);
  return null;
}