"use client";

import React, { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { PieChart } from "@/components/ui/Chart";
import { apiFetch } from "@/lib/api";

type CategoryResp = {
  categories: Array<{ categoryId: number; amount: number; percentage: number }>;
};

type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
};

type CategoriesResp = { categories: Category[] };

export default function CategoryReportPage() {
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [data, setData] = useState<CategoryResp | null>(null);
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
      const d = await apiFetch<CategoryResp>(
        `/api/v1/reports/category?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load category report");
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
  }, [startDate, endDate, categories.length]);

  const getCategoryName = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.name || `Category #${categoryId}`;
  };

  const getCategoryColor = (categoryId: number) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat?.color || "#3b82f6";
  };

  const totalAmount = data?.categories.reduce((sum, c) => sum + c.amount, 0) || 0;

  const chartData = data?.categories.map((c) => ({
    label: getCategoryName(c.categoryId),
    value: c.amount,
    color: getCategoryColor(c.categoryId),
  })) || [];

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Category Breakdown</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Analyze spending distribution across categories
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <Card
          title="Date Range"
          actions={
            <Button variant="secondary" onClick={load} disabled={busy}>
              {busy ? "Loading…" : "Refresh"}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
            <Input label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
            <Input label="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
          </div>
        </Card>

        {data && (
          <>
            <Card title="Total Spending" className="mt-6">
              <div className="text-4xl font-bold text-zinc-900 dark:text-zinc-50">
                ${totalAmount.toFixed(2)}
              </div>
              <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Across {data.categories.length} {data.categories.length === 1 ? "category" : "categories"}
              </div>
            </Card>

            <Card title="Category Distribution" className="mt-6">
              {chartData.length > 0 ? (
                <>
                  <PieChart data={chartData} />
                  <div className="mt-6 space-y-2">
                    {data.categories
                      .sort((a, b) => b.amount - a.amount)
                      .map((c) => {
                        const cat = categories.find((cat) => cat.id === c.categoryId);
                        return (
                          <div
                            key={c.categoryId}
                            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-12 w-12 items-center justify-center rounded-lg text-xl"
                                style={{
                                  backgroundColor: cat?.color ? `${cat.color}20` : "#f3f4f6",
                                  color: cat?.color || "#6b7280",
                                }}
                              >
                                {cat?.icon || "📌"}
                              </div>
                              <div>
                                <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                                  {cat?.name || `Category #${c.categoryId}`}
                                </div>
                                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                  {c.percentage.toFixed(1)}% of total spending
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
                                ${Number(c.amount).toFixed(2)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-500">No expenses found in this date range</div>
              )}
            </Card>
          </>
        )}

        {!data && !busy && (
          <Card title="No Data" className="mt-6">
            <div className="py-8 text-center text-sm text-zinc-500">
              Select a date range and click Refresh to load data
            </div>
          </Card>
        )}
      </AppShell>
    </RequireAuth>
  );
}
