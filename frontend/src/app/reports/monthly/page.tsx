"use client";

import React, { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";

type MonthlyResp = {
  totalSpent: number;
  expenseCount: number;
  byCategory: Array<{ category_id: number; amount: number }>;
  budgetExceeded: Array<{
    category_id: number;
    name: string;
    icon: string | null;
    color: string | null;
    budget: number;
    spent: number;
    exceededBy: number;
  }>;
};


type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

type CategoriesResp = { categories: Category[] };

export default function MonthlyReportPage() {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1).padStart(2, "0"));
  const [data, setData] = useState<MonthlyResp | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);


  async function loadCategories() {
    try {
      const r = await apiFetch<CategoriesResp>("/api/v1/categories");
      setCategories(r.categories || []);
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  }

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      // Add cache-busting timestamp to prevent browser caching
      const timestamp = Date.now();
      // Use fetch directly with cache: 'no-store' to bypass all caching
      const tokens = await import("@/lib/authTokens").then(m => m.getTokens());
      const env = await import("@/lib/env").then(m => m.env);
      
      const headers: HeadersInit = {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      };
      
      if (tokens?.accessToken) {
        headers['Authorization'] = `Bearer ${tokens.accessToken}`;
      }

      const res = await fetch(
        `${env.apiBaseUrl}/api/v1/reports/monthly?year=${encodeURIComponent(year)}&month=${encodeURIComponent(month)}&_t=${timestamp}`,
        {
          method: 'GET',
          headers,
          cache: 'no-store', // This bypasses browser cache completely
        }
      );

      if (!res.ok) {
        const errorBody = await res.json().catch(() => ({}));
        throw new Error(errorBody.error || errorBody.message || `Request failed (${res.status})`);
      }

      const d = await res.json() as MonthlyResp;
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load monthly report");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, categories.length]);

  // Auto-refresh when window gains focus and every 30 seconds
  useEffect(() => {
    const handleFocus = () => {
      if (categories.length > 0 && !busy) {
        load();
      }
    };

    const interval = setInterval(() => {
      if (document.hasFocus() && categories.length > 0 && !busy) {
        load();
      }
    }, 30000); // 30 seconds

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [categories.length, busy, year, month]);

  const getCategoryName = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? `${cat.icon || "📌"} ${cat.name}` : `Category #${categoryId}`;
  };

  const getCategoryColor = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || "#3b82f6";
  };


  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Monthly Report</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            View your spending summary for a specific month
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <Card
          title="Select Month"
          actions={
            <Button variant="secondary" onClick={load} disabled={busy}>
              {busy ? "Loading…" : "Refresh"}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
            <Input
              label="Year"
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              min="2000"
              max="2100"
            />
            <Input
              label="Month"
              type="number"
              value={month}
              onChange={(e) => setMonth(e.target.value.padStart(2, "0"))}
              min="1"
              max="12"
              placeholder="1-12"
            />
          </div>
        </Card>

        {data && (
          <>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Card title="Total Spent">
                <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${Number(data.totalSpent).toFixed(2)}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {data.expenseCount} {data.expenseCount === 1 ? "expense" : "expenses"}
                </div>
              </Card>

              <Card title="Average per Expense">
                <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${data.expenseCount > 0 ? (Number(data.totalSpent) / data.expenseCount).toFixed(2) : "0.00"}
                </div>
                <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Based on {data.expenseCount} {data.expenseCount === 1 ? "expense" : "expenses"}
                </div>
              </Card>
            </div>

            <Card title="Budget Alerts" className="mt-6">
              {data?.budgetExceeded && data.budgetExceeded.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                    {data.budgetExceeded.length} categor{data.budgetExceeded.length === 1 ? 'y has' : 'ies have'} exceeded their monthly budget
                  </div>
                  {data.budgetExceeded.map((item) => (
                    <div
                      key={item.category_id}
                      className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-lg text-lg"
                          style={{
                            backgroundColor: item.color ? `${item.color}20` : "#f3f4f6",
                            color: item.color || "#6b7280",
                          }}
                        >
                          {item.icon || "📌"}
                        </div>
                        <div>
                          <div className="font-medium text-zinc-900 dark:text-zinc-50">
                            {item.name}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            Budget: ${item.budget.toFixed(2)} | Spent: ${item.spent.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-red-600 dark:text-red-400">
                          +${item.exceededBy.toFixed(2)}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          over budget
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-green-600 dark:text-green-400">
                  ✅ All categories are within their monthly budget limits
                </div>
              )}
            </Card>
          </>
        )}

        {!data && !busy && (
          <Card title="No Data" className="mt-6">
            <div className="py-8 text-center text-sm text-zinc-500">
              Select a month and click Refresh to load data
            </div>
          </Card>
        )}
      </AppShell>
    </RequireAuth>
  );
}
