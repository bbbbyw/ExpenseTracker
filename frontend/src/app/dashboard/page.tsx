"use client";

import React, { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import { LineChart, PieChart } from "@/components/ui/Chart";
import { apiFetch } from "@/lib/api";

type DashboardResp = {
  currentMonth: { spent: number; expenseCount: number };
  topCategories: Array<{ category_id: number; amount: number }>;
  recentExpenses: Array<{
    id: number;
    category_id: number;
    amount: number;
    description: string | null;
    expense_date: string;
  }>;
  monthlyTrend: Array<{ date: string; amount: number }>;
};

type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

type CategoriesResp = { categories: Category[] };

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResp | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function loadCategories() {
    try {
      const r = await apiFetch<CategoriesResp>("/api/v1/categories");
      setCategories(r.categories || []);
    } catch (e) {
      console.error("Failed to load categories:", e);
    }
  }

  useEffect(() => {
    loadCategories();
    (async () => {
      try {
        setErr(null);
        const d = await apiFetch<DashboardResp>("/api/v1/reports/dashboard");
        setData(d);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    })();
  }, []);

  const getCategoryName = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? `${cat.icon || "📌"} ${cat.name}` : `Category #${categoryId}`;
  };

  const getCategoryColor = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || "#3b82f6";
  };

  // Prepare chart data
  const trendData = data?.monthlyTrend.map((item) => ({
    label: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: item.amount,
  })) || [];

  const topCategoriesData = data?.topCategories.slice(0, 8).map((c) => ({
    label: getCategoryName(c.category_id),
    value: c.amount,
    color: getCategoryColor(c.category_id),
  })) || [];

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card title="Current month">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Spent</div>
            <div className="mt-1 text-2xl font-semibold">
              ${data ? Number(data.currentMonth.spent).toFixed(2) : "—"}
            </div>
            <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Expenses</div>
            <div className="mt-1 text-lg font-semibold">
              {data ? data.currentMonth.expenseCount : "—"}
            </div>
          </Card>

          <Card title="Top categories (month)">
            <div className="space-y-2 text-sm">
              {(data?.topCategories || []).slice(0, 5).map((c) => (
                <div key={c.category_id} className="flex items-center justify-between">
                  <div className="text-zinc-600 dark:text-zinc-400">{getCategoryName(c.category_id)}</div>
                  <div className="font-medium">${Number(c.amount).toFixed(2)}</div>
                </div>
              ))}
              {!data ? <div className="text-zinc-500">—</div> : null}
              {data && data.topCategories.length === 0 ? (
                <div className="text-zinc-500">No data yet</div>
              ) : null}
            </div>
          </Card>

          <Card title="Recent expenses">
            <div className="space-y-2 text-sm">
              {(data?.recentExpenses || []).slice(0, 6).map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{e.description || "(no description)"}</div>
                    <div className="text-xs text-zinc-500">
                      {String(e.expense_date).slice(0, 10)} · {getCategoryName(e.category_id)}
                    </div>
                  </div>
                  <div className="shrink-0 font-semibold">${Number(e.amount).toFixed(2)}</div>
                </div>
              ))}
              {!data ? <div className="text-zinc-500">—</div> : null}
              {data && data.recentExpenses.length === 0 ? (
                <div className="text-zinc-500">No expenses yet</div>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card title="Monthly Spending Trend">
            {trendData.length > 0 ? (
              <LineChart data={trendData} height={250} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                No trend data available
              </div>
            )}
          </Card>

          <Card title="Top Categories Distribution">
            {topCategoriesData.length > 0 ? (
              <PieChart data={topCategoriesData} size={200} />
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-zinc-500">
                No category data available
              </div>
            )}
          </Card>
        </div>
      </AppShell>
    </RequireAuth>
  );
}

