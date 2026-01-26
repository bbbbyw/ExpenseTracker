"use client";

import Link from "next/link";
import React from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";

const reportCards = [
  {
    id: "monthly",
    title: "Monthly Report",
    description: "View your spending summary by month",
    icon: "📅",
    color: "from-blue-500 to-blue-600",
    href: "/reports/monthly",
  },
  {
    id: "category",
    title: "Category Breakdown",
    description: "See spending distribution across categories",
    icon: "📊",
    color: "from-purple-500 to-purple-600",
    href: "/reports/category",
  },
  {
    id: "trend",
    title: "Spending Trends",
    description: "Track your expenses over time",
    icon: "📈",
    color: "from-green-500 to-green-600",
    href: "/reports/trend",
  },
  {
    id: "export",
    title: "Export Data",
    description: "Download your expense data as CSV",
    icon: "💾",
    color: "from-orange-500 to-orange-600",
    href: "/reports/export",
  },
];

export default function ReportsIndexPage() {
  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">View Reports</h1>
          <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
            Analyze your expenses with detailed insights and visualizations
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {reportCards.map((report) => (
            <Link
              key={report.id}
              href={report.href}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl dark:bg-zinc-900"
            >
              {/* Icon Background */}
              <div className={`h-32 bg-gradient-to-br ${report.color} flex items-center justify-center`}>
                <span className="text-6xl">{report.icon}</span>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="mb-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">{report.title}</h3>
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{report.description}</p>
                <Button className="w-full" variant="primary">
                  View Report
                </Button>
              </div>

              {/* Hover Effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </AppShell>
    </RequireAuth>
  );
}
