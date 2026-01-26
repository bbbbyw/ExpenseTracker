"use client";

import React, { useEffect, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { LineChart } from "@/components/ui/Chart";
import { apiFetch } from "@/lib/api";

type TrendResp = {
  data: Array<{ date: string; amount: number }>;
};

export default function TrendReportPage() {
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [interval, setInterval] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [data, setData] = useState<TrendResp | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const d = await apiFetch<TrendResp>(
        `/api/v1/reports/trend?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}&interval=${encodeURIComponent(interval)}`
      );
      setData(d);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load trend report");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, interval]);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (interval === "daily") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (interval === "weekly") {
      return `Week ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
    } else {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
  };

  const chartData = data?.data.map((d) => ({
    label: formatDateLabel(d.date),
    value: d.amount,
  })) || [];

  const totalAmount = data?.data.reduce((sum, d) => sum + d.amount, 0) || 0;
  const averageAmount = data && data.data.length > 0 ? totalAmount / data.data.length : 0;
  const maxAmount = data ? Math.max(...data.data.map((d) => d.amount), 0) : 0;
  const minAmount = data && data.data.length > 0 ? Math.min(...data.data.map((d) => d.amount), 0) : 0;

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Spending Trends</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Track your expenses over time with visual trends
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <Card
          title="Parameters"
          actions={
            <Button variant="secondary" onClick={load} disabled={busy}>
              {busy ? "Loading…" : "Refresh"}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 max-w-2xl">
            <Input label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
            <Input label="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
            <label className="block">
              <div className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Interval</div>
              <select
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-200"
                value={interval}
                onChange={(e) => setInterval(e.target.value as "daily" | "weekly" | "monthly")}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
          </div>
        </Card>

        {data && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card title="Total">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${totalAmount.toFixed(2)}
                </div>
              </Card>
              <Card title="Average">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${averageAmount.toFixed(2)}
                </div>
              </Card>
              <Card title="Maximum">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${maxAmount.toFixed(2)}
                </div>
              </Card>
              <Card title="Minimum">
                <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
                  ${minAmount.toFixed(2)}
                </div>
              </Card>
            </div>

            <Card title="Spending Trend" className="mt-6">
              {chartData.length > 0 ? (
                <>
                  <LineChart data={chartData} color="#10b981" />
                  <div className="mt-6 space-y-2">
                    {data.data.map((d) => (
                      <div
                        key={d.date}
                        className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900"
                      >
                        <div className="font-medium text-zinc-900 dark:text-zinc-50">
                          {formatDateLabel(d.date)}
                        </div>
                        <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                          ${Number(d.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-500">No data available for this period</div>
              )}
            </Card>
          </>
        )}

        {!data && !busy && (
          <Card title="No Data" className="mt-6">
            <div className="py-8 text-center text-sm text-zinc-500">
              Select parameters and click Refresh to load data
            </div>
          </Card>
        )}
      </AppShell>
    </RequireAuth>
  );
}
