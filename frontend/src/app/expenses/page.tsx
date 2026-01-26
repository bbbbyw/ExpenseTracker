"use client";

import React, { useEffect, useMemo, useState } from "react";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { apiFetch } from "@/lib/api";

type Expense = {
  id: number;
  user_id: number;
  category_id: number;
  amount: number;
  description: string | null;
  expense_date: string;
  receipt_url: string | null;
  created_at: string;
  updated_at: string | null;
};

type ExpenseListResp = { expenses: Expense[]; pagination: { page: number; limit: number } };

type StatsResp = {
  totalExpenses: number;
  totalAmount: number;
  averageAmount: number;
  minAmount: number;
  maxAmount: number;
};

type Category = {
  id: number;
  name: string;
  icon: string | null;
  color: string | null;
  is_default: boolean;
};

type CategoriesResp = { categories: Category[] };

export default function ExpensesPage() {
  const [items, setItems] = useState<Expense[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [stats, setStats] = useState<StatsResp | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Categories for dropdown
  const [categories, setCategories] = useState<Category[]>([]);

  // Create expense modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCategoryId, setNewCategoryId] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newExpenseDate, setNewExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [editing, setEditing] = useState<Expense | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState("");

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    if (categoryId) p.set("categoryId", categoryId);
    p.set("page", String(page));
    p.set("limit", String(limit));
    return p.toString();
  }, [startDate, endDate, categoryId, page, limit]);

  async function load() {
    setBusy(true);
    setErr(null);
    try {
      const list = await apiFetch<ExpenseListResp>(`/api/v1/expenses?${qs}`);
      setItems(list.expenses || []);

      // stats for same range/category (no pagination)
      const p = new URLSearchParams();
      if (startDate) p.set("startDate", startDate);
      if (endDate) p.set("endDate", endDate);
      if (categoryId) p.set("categoryId", categoryId);
      const s = await apiFetch<StatsResp>(`/api/v1/expenses/stats?${p.toString()}`);
      setStats(s);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to load expenses");
    } finally {
      setBusy(false);
    }
  }

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
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  return (
    <RequireAuth>
      <AppShell>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            + Create Expense
          </Button>
        </div>

        {err ? (
          <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
            {err}
          </div>
        ) : null}

        {/* Create Expense Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-lg dark:border-zinc-800 dark:bg-black">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Create New Expense</h2>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCategoryId("");
                    setNewAmount("");
                    setNewDescription("");
                    setNewExpenseDate(new Date().toISOString().slice(0, 10));
                  }}
                  className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  ✕
                </button>
              </div>
              <form
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setErr(null);
                  try {
                    await apiFetch<Expense>("/api/v1/expenses", {
                      method: "POST",
                      body: JSON.stringify({
                        categoryId: Number(newCategoryId),
                        amount: Number(newAmount),
                        description: newDescription || undefined,
                        expenseDate: newExpenseDate,
                      }),
                    });
                    setNewCategoryId("");
                    setNewAmount("");
                    setNewDescription("");
                    setNewExpenseDate(new Date().toISOString().slice(0, 10));
                    setShowCreateModal(false);
                    await load();
                  } catch (ex) {
                    setErr(ex instanceof Error ? ex.message : "Failed to create expense");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Category</div>
                  <select
                    value={newCategoryId}
                    onChange={(e) => setNewCategoryId(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-200"
                    required
                  >
                    <option value="">Select a category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || "📌"} {cat.name} {cat.is_default ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <Input
                  label="Amount"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  placeholder="e.g. 12.50"
                  required
                />
                <Input
                  label="Description"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional"
                />
                <Input
                  label="Expense date"
                  value={newExpenseDate}
                  onChange={(e) => setNewExpenseDate(e.target.value)}
                  type="date"
                  required
                />
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewCategoryId("");
                      setNewAmount("");
                      setNewDescription("");
                      setNewExpenseDate(new Date().toISOString().slice(0, 10));
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={busy || !newCategoryId || !newAmount || !newExpenseDate}>
                    {busy ? "Creating…" : "Create"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-4">
            {editing && (
              <Card title={`Edit expense #${editing.id}`}>
                <form
                  className="space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    setErr(null);
                    try {
                      await apiFetch(`/api/v1/expenses/${editing.id}`, {
                        method: "PUT",
                        body: JSON.stringify({
                          categoryId: editCategoryId ? Number(editCategoryId) : undefined,
                          amount: editAmount ? Number(editAmount) : undefined,
                          description: editDescription || undefined,
                          expenseDate: editExpenseDate || undefined,
                        }),
                      });
                      setEditing(null);
                      await load();
                    } catch (ex) {
                      setErr(ex instanceof Error ? ex.message : "Update failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <label className="block">
                      <div className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Category</div>
                      <select
                        value={editCategoryId || editing.category_id}
                        onChange={(e) => setEditCategoryId(e.target.value)}
                        className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-200"
                      >
                        <option value={editing.category_id}>
                          {categories.find(c => c.id === editing.category_id)?.icon || "📌"} {categories.find(c => c.id === editing.category_id)?.name || `Category #${editing.category_id}`}
                        </option>
                        {categories.filter(c => c.id !== editing.category_id).map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.icon || "📌"} {cat.name} {cat.is_default ? "(Default)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Input
                      label="Amount"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder={`current: ${editing.amount}`}
                    />
                  </div>
                  <Input
                    label="Description"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={editing.description || "(unchanged)"}
                  />
                  <Input
                    label="Expense date"
                    type="date"
                    value={editExpenseDate}
                    onChange={(e) => setEditExpenseDate(e.target.value)}
                    placeholder={String(editing.expense_date).slice(0, 10)}
                  />
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditing(null)}
                      disabled={busy}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={busy}>
                      {busy ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              </Card>
            )}

            <Card title="Filters" actions={<Button variant="secondary" onClick={load} disabled={busy}>Refresh</Button>}>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                <Input label="Start date" value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" />
                <Input label="End date" value={endDate} onChange={(e) => setEndDate(e.target.value)} type="date" />
                <label className="block">
                  <div className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">Category</div>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-200"
                  >
                    <option value="">All categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon || "📌"} {cat.name} {cat.is_default ? "(Default)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Page" value={String(page)} onChange={(e) => setPage(Number(e.target.value || 1))} />
                  <Input label="Limit" value={String(limit)} onChange={(e) => setLimit(Number(e.target.value || 10))} />
                </div>
              </div>
              {stats ? (
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
                  <div><div className="text-zinc-500">Count</div><div className="font-semibold">{stats.totalExpenses}</div></div>
                  <div><div className="text-zinc-500">Total</div><div className="font-semibold">{Number(stats.totalAmount).toFixed(2)}</div></div>
                  <div><div className="text-zinc-500">Avg</div><div className="font-semibold">{Number(stats.averageAmount).toFixed(2)}</div></div>
                  <div><div className="text-zinc-500">Min</div><div className="font-semibold">{Number(stats.minAmount).toFixed(2)}</div></div>
                  <div><div className="text-zinc-500">Max</div><div className="font-semibold">{Number(stats.maxAmount).toFixed(2)}</div></div>
                </div>
              ) : null}
            </Card>

            <Card title={`Results (${items.length})`}>
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {items.map((e) => {
                  const category = categories.find(c => c.id === e.category_id);
                  const categoryName = category 
                    ? `${category.icon || "📌"} ${category.name}`
                    : `Category #${e.category_id}`;
                  
                  return (
                  <div key={e.id} className="py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{e.description || "(no description)"}</div>
                      <div className="text-xs text-zinc-500">
                        {String(e.expense_date).slice(0, 10)} · {categoryName} · id #{e.id}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">{Number(e.amount).toFixed(2)}</div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={async () => {
                          setBusy(true);
                          setErr(null);
                          try {
                            const full = await apiFetch<Expense>(`/api/v1/expenses/${e.id}`);
                            setEditing(full);
                            setEditCategoryId("");
                            setEditAmount("");
                            setEditDescription("");
                            setEditExpenseDate("");
                          } catch (ex) {
                            setErr(ex instanceof Error ? ex.message : "Load expense failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                        disabled={busy}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        onClick={async () => {
                          if (!confirm(`Delete expense #${e.id}?`)) return;
                          setBusy(true);
                          setErr(null);
                          try {
                            await apiFetch(`/api/v1/expenses/${e.id}`, { method: "DELETE" });
                            await load();
                          } catch (ex) {
                            setErr(ex instanceof Error ? ex.message : "Delete failed");
                          } finally {
                            setBusy(false);
                          }
                        }}
                        disabled={busy}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  );
                })}
                {busy && items.length === 0 ? <div className="py-3 text-sm text-zinc-500">Loading…</div> : null}
                {!busy && items.length === 0 ? <div className="py-3 text-sm text-zinc-500">No expenses found.</div> : null}
              </div>
            </Card>
          </div>
      </AppShell>
    </RequireAuth>
  );
}

