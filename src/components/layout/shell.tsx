"use client";

import { useAuth } from "@/lib/auth";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SearchPalette } from "@/components/shared/search-palette";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

interface ShellProps {
  children: ReactNode;
}

export function Shell({ children }: ShellProps) {
  const { user, profile, loading, signOut } = useAuth();
  const router = useRouter();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground animate-pulse">
            <Shield className="h-6 w-6" />
          </div>
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
    );
  }

  // Not authenticated — will redirect
  if (!user) return null;

  // No org / not business tier — gate page
  if (!profile?.orgId) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-4">
        <div className="max-w-lg text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
            <Shield className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            Dashboard Access Required
          </h2>
          <p className="text-sm text-muted-foreground">
            The web dashboard requires an active Business subscription and an
            organization linked to your account.
          </p>
          <div className="mx-auto max-w-sm rounded-lg border bg-card p-4 text-left space-y-3 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">To get started:</p>
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Open the <strong>SafeCheck Pro</strong> mobile app</li>
              <li>Subscribe to the <strong>Business</strong> tier</li>
              <li>Create or join an <strong>organization</strong></li>
              <li>Return here and sign in with the same account</li>
            </ol>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Sign out and use a different account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-[1440px]">{children}</div>
        </main>
      </div>
      <SearchPalette />
    </div>
  );
}
