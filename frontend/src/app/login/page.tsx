"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const next = useMemo(() => sp.get("next") || "/dashboard", [sp]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-black">
        <h1 className="text-xl font-semibold">Login</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Use your registered account.
        </p>

        <form
          className="mt-6 space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            try {
              await login(email, password);
              router.replace(next);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Login failed");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
          <Input label="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
              {error}
            </div>
          ) : null}

          <Button className="w-full" type="submit" disabled={busy}>
            {busy ? "Logging in…" : "Login"}
          </Button>
        </form>

        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No account?{" "}
          <Link className="font-medium text-zinc-900 underline underline-offset-4 dark:text-zinc-100" href="/register">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}

