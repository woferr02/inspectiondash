"use client";

import { Shell } from "@/components/layout/shell";
import type { ReactNode } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <Shell>{children}</Shell>;
}
