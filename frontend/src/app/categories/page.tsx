"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";

type Category = {
  id: number;
  user_id: number | null;
  name: string;
  color: string | null;
  icon: string | null;
  monthly_budget: number | null;
  is_default: boolean;
};

type CategoriesResp = { categories: Category[] };

type SpendingResp = {
  categoryId: number;
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
};

export default function CategoriesPage() {
  const [items, setItems] = useState<Category[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Create category modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("#FF6B6B");
  const [icon, setIcon] = useState("📌");
  const [monthlyBudget, setMonthlyBudget] = useState("");

  // Spending month - using month input type
  const [spendingMonth, setSpendingMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [spending, setSpending] = useState<Record<number, SpendingResp>>({});
  const [loadingSpending, setLoadingSpending] = useState<Record<number, boolean>>({});

  // Edit state
  const [editing, setEditing] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editMonthlyBudget, setEditMonthlyBudget] = useState("");
  const [editBudgetOnly, setEditBudgetOnly] = useState(false);

  const canCreate = useMemo(() => name.trim().length > 0, [name]);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const r = await apiFetch<CategoriesResp>("/api/v1/categories");
      setItems(r.categories || []);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load categories");
    } finally {
      setBusy(false);
    }
  }

  // Auto-load spending when month changes
  useEffect(() => {
    if (items.length > 0 && spendingMonth) {
      loadAllSpending();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spendingMonth, items.length]);

  async function loadAllSpending() {
    // Load spending for all categories with budgets (both default and user categories)
    for (const category of items) {
      const budget = Number(category.monthly_budget) || 0;
      if (budget > 0) {
        try {
          setLoadingSpending((prev) => ({ ...prev, [category.id]: true }));
          const s = await apiFetch<SpendingResp>(
            `/api/v1/categories/${category.id}/spending?month=${encodeURIComponent(spendingMonth)}`
          );
          setSpending((prev) => ({ ...prev, [category.id]: s }));
        } catch (e) {
          // Silently fail for categories without spending data
          console.warn(`Failed to load spending for category ${category.id}:`, e);
        } finally {
          setLoadingSpending((prev) => ({ ...prev, [category.id]: false }));
        }
      }
    }
  }

  useEffect(() => {
    load();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/api/v1/categories", {
        method: "POST",
        body: JSON.stringify({
          name,
          color: color || undefined,
          icon: icon || undefined,
          monthlyBudget: monthlyBudget ? Number(monthlyBudget) : undefined,
        }),
      });
      setName("");
      setColor("#FF6B6B");
      setIcon("📌");
      setMonthlyBudget("");
      setShowCreateModal(false);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Create failed");
    } finally {
      setBusy(false);
    }
  };

  const handleEditCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setBusy(true);
    setErr(null);
    try {
      // For default categories, always use general update endpoint
      // The budget-only endpoint doesn't work for defaults (user_id is null)
      if (editBudgetOnly && !editing.is_default) {
        // Use budget endpoint only for non-default categories
        await apiFetch(`/api/v1/categories/${editing.id}/budget`, {
          method: "PUT",
          body: JSON.stringify({
            monthlyBudget: Number(editMonthlyBudget || editing.monthly_budget || 0),
          }),
        });
      } else {
        // Use general update endpoint for defaults or full edits
        await apiFetch(`/api/v1/categories/${editing.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: editing.is_default ? undefined : (editName || undefined),
            color: editing.is_default ? undefined : (editColor || undefined),
            icon: editing.is_default ? undefined : (editIcon || undefined),
            monthlyBudget: editMonthlyBudget ? Number(editMonthlyBudget) : undefined,
          }),
        });
      }
      setEditing(null);
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Update failed");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    setBusy(true);
    setErr(null);
    try {
      await apiFetch(`/api/v1/categories/${id}`, { method: "DELETE" });
      await load();
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (category: Category, budgetOnly: boolean = false) => {
    setEditing(category);
    setEditName(category.name);
    setEditColor(category.color || "#FF6B6B");
    setEditIcon(category.icon || "📌");
    setEditMonthlyBudget(category.monthly_budget?.toString() || "");
    setEditBudgetOnly(budgetOnly);
  };

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Manage your expense categories and budgets
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Category
          </Button>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        {/* Create Category Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-black">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create New Category</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setName("");
                    setColor("#FF6B6B");
                    setIcon("📌");
                    setMonthlyBudget("");
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <Input
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Coffee"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      Color
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="h-10 w-16 cursor-pointer rounded-md border border-zinc-300 dark:border-zinc-700"
                      />
                      <Input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="#FF6B6B"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <Input
                    label="Icon"
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    placeholder="📌"
                  />
                </div>
                <Input
                  label="Monthly Budget"
                  type="number"
                  value={monthlyBudget}
                  onChange={(e) => setMonthlyBudget(e.target.value)}
                  placeholder="e.g. 200 (optional)"
                  min="0"
                  step="0.01"
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateModal(false);
                      setName("");
                      setColor("#FF6B6B");
                      setIcon("📌");
                      setMonthlyBudget("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={busy || !canCreate}>
                    {busy ? "Creating…" : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-black">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editBudgetOnly ? "Edit Budget" : `Edit Category: ${editing.name}`}
                </h2>
                <button
                  onClick={() => setEditing(null)}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
              <form onSubmit={handleEditCategory} className="space-y-4">
                {!editBudgetOnly && (
                  <>
                    <Input
                      label="Name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder={editing.name}
                      disabled={editing.is_default}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Color
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="color"
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            className="h-10 w-16 cursor-pointer rounded-md border border-zinc-300 dark:border-zinc-700"
                            disabled={editing.is_default}
                          />
                          <Input
                            value={editColor}
                            onChange={(e) => setEditColor(e.target.value)}
                            placeholder={editing.color || "#FF6B6B"}
                            className="flex-1"
                            disabled={editing.is_default}
                          />
                        </div>
                      </div>
                      <Input
                        label="Icon"
                        value={editIcon}
                        onChange={(e) => setEditIcon(e.target.value)}
                        placeholder={editing.icon || "📌"}
                        disabled={editing.is_default}
                      />
                    </div>
                  </>
                )}
                <Input
                  label="Monthly Budget"
                  type="number"
                  value={editMonthlyBudget}
                  onChange={(e) => setEditMonthlyBudget(e.target.value)}
                  placeholder={String(editing.monthly_budget ?? "")}
                  min="0"
                  step="0.01"
                />
                {!editing.is_default && (
                  <div className="flex items-center gap-2 rounded-md bg-zinc-100 p-2 text-xs dark:bg-zinc-900">
                    <span className="text-zinc-600 dark:text-zinc-400">Mode:</span>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 transition-colors ${
                        !editBudgetOnly
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-transparent text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => setEditBudgetOnly(false)}
                    >
                      Full Edit
                    </button>
                    <button
                      type="button"
                      className={`rounded-full px-3 py-1 transition-colors ${
                        editBudgetOnly
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                          : "bg-transparent text-zinc-600 hover:bg-zinc-200 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      }`}
                      onClick={() => setEditBudgetOnly(true)}
                    >
                      Budget Only
                    </button>
                  </div>
                )}
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setEditing(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={busy}>
                    {busy ? "Saving…" : "Save"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Spending Month Selector */}
        <Card
          title="View Spending"
          actions={
            <Button variant="secondary" onClick={loadAllSpending} disabled={busy} size="sm">
              Refresh
            </Button>
          }
        >
          <div className="max-w-xs">
            <Input
              label="Select Month"
              type="month"
              value={spendingMonth}
              onChange={(e) => setSpendingMonth(e.target.value)}
            />
            <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
              View spending statistics for the selected month
            </p>
          </div>
        </Card>

        {/* Categories List */}
        <Card title={`Categories (${items.length})`} >
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((c) => {
              const categorySpending = spending[c.id];
              const budget = Number(c.monthly_budget) || 0;
              const spent = Number(categorySpending?.spent) || 0;
              const remaining = Number(categorySpending?.remaining) ?? (budget - spent);
              const percentage = budget > 0 ? (spent / budget) * 100 : 0;

              return (
                <div key={c.id} className="py-4">
                  <div className="flex items-start gap-4">
                    {/* Icon and Color Display */}
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg text-2xl shadow-sm"
                      style={{
                        backgroundColor: c.color ? `${c.color}20` : "#f3f4f6",
                        color: c.color || "#6b7280",
                      }}
                    >
                      {c.icon || "📌"}
                    </div>

                    {/* Category Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {c.name}
                        </div>
                        {c.is_default && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Default
                          </span>
                        )}
                      </div>

                      {/* Budget and Spending Info */}
                      <div className="mt-2 space-y-1">
                        {budget > 0 ? (
                          <>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Budget: <span className="font-medium text-zinc-900 dark:text-zinc-50">${budget.toFixed(2)}</span>
                              </span>
                              {categorySpending ? (
                                <>
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    Spent: <span className="font-medium text-zinc-900 dark:text-zinc-50">${spent.toFixed(2)}</span>
                                  </span>
                                  <span className={`font-medium ${
                                    remaining >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                                  }`}>
                                    Remaining: ${remaining.toFixed(2)}
                                  </span>
                                </>
                              ) : loadingSpending[c.id] ? (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">Loading spending...</span>
                              ) : (
                                <span className="text-xs text-zinc-500 dark:text-zinc-400">No spending data</span>
                              )}
                            </div>
                            {categorySpending ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                  <div
                                    className={`h-full transition-all ${
                                      percentage > 100
                                        ? "bg-red-500"
                                        : percentage > 80
                                          ? "bg-yellow-500"
                                          : "bg-green-500"
                                    }`}
                                    style={{ width: `${Math.min(percentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                            ) : budget > 0 && !loadingSpending[c.id] ? (
                              <div className="flex items-center gap-2">
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                                  <div className="h-full bg-zinc-300 dark:bg-zinc-700" style={{ width: "0%" }} />
                                </div>
                                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">0%</span>
                              </div>
                            ) : null}
                          </>
                        ) : (
                          <p className="text-sm text-zinc-500 dark:text-zinc-400">No budget set</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons - Horizontal Layout */}
                    <div className="flex shrink-0 items-center gap-2">
                      {c.is_default ? (
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => startEdit(c, true)}
                          disabled={busy}
                          title="Edit budget only"
                        >
                          💰 Budget
                        </Button>
                      ) : (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => startEdit(c, false)}
                            disabled={busy}
                            title="Edit category"
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            type="button"
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteCategory(c.id, c.name)}
                            disabled={busy}
                            title="Delete category"
                          >
                            🗑️ Delete
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {busy && items.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">Loading categories…</div>
            ) : null}
            {!busy && items.length === 0 ? (
              <div className="py-8 text-center text-sm text-zinc-500">
                No categories found. Create your first category!
              </div>
            ) : null}
          </div>
        </Card>
      </AppShell>
    </RequireAuth>
  );
}
