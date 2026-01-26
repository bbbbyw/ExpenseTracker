"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button } from "@/components/ui/Button";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-900"
      }`}
    >
      {label}
    </Link>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-black dark:text-zinc-50">
      <header className="border-b border-zinc-200 bg-white/70 backdrop-blur dark:border-zinc-800 dark:bg-black/40">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold tracking-tight">
              Expense Tracker
            </Link>
            <nav className="hidden gap-1 md:flex">
              <NavLink href="/dashboard" label="Dashboard" />
              <NavLink href="/expenses" label="Expenses" />
              <NavLink href="/categories" label="Categories" />
              <NavLink href="/reports" label="Reports" />
            </nav>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <div className="hidden text-sm text-zinc-600 dark:text-zinc-300 md:block">
                  {user.firstName} {user.lastName}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    logout();
                    router.push("/login");
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Link className="text-sm font-medium underline underline-offset-4" href="/login">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}

