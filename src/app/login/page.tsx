"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Shield, Mail, Lock, Chrome } from "lucide-react";
import { toast } from "sonner";

export default function LoginPage() {
  const { signInWithEmail, signInWithGoogle, sendPasswordReset, loading, error, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetSent, setResetSent] = useState(false);

  // Redirect to dashboard once authenticated
  useEffect(() => {
    if (user && !loading) {
      router.replace("/");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signInWithEmail(email, password);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast.error("Enter your email address first, then click Forgot password.");
      return;
    }
    try {
      await sendPasswordReset(email);
      setResetSent(true);
      toast.success("If an account exists with this email, a reset link has been sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-4 text-center pb-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-teal text-white">
            <Shield className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              SafeCheck Pro
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Compliance Dashboard
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/20 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  autoComplete="email"
                  required
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-teal hover:bg-teal-dark text-white"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {resetSent && (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded-lg p-3 text-center dark:bg-emerald-950/20 dark:text-emerald-400">
              If an account exists with that email, check your inbox for a reset link.
            </p>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={signInWithGoogle}
            disabled={loading}
          >
            <Chrome className="mr-2 h-4 w-4" />
            Google
          </Button>

          <p className="text-center text-xs text-muted-foreground pt-2">
            Sign in with the same account you use in the SafeCheck Pro mobile app.
            <br />
            New here?{" "}
            <span className="font-medium text-foreground">Create an account in the mobile app first,</span>{" "}
            then sign in here with a Business subscription.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
