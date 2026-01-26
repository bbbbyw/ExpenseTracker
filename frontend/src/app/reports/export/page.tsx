"use client";

import React, { useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiDownloadCsv } from "@/lib/api";

export default function ExportReportPage() {
  const [startDate, setStartDate] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Export Data</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Download your expense data as a CSV file for analysis
          </p>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        <Card
          title="Export Settings"
          actions={
            <Button
              onClick={async () => {
                setBusy(true);
                setErr(null);
                try {
                  await apiDownloadCsv(
                    "/api/v1/reports/export",
                    { startDate, endDate, format: "csv" },
                    `expenses_${startDate}_to_${endDate}.csv`
                  );
                } catch (e) {
                  setErr(e instanceof Error ? e.message : "Export failed");
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
            >
              {busy ? "Downloading…" : "💾 Download CSV"}
            </Button>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 max-w-lg">
            <Input label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
            <Input label="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
          </div>
          <div className="mt-4 rounded-lg bg-blue-50 p-4 dark:bg-blue-950/20">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> The CSV file will contain all expenses within the selected date range, including
              category IDs, amounts, descriptions, and dates.
            </p>
          </div>
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
