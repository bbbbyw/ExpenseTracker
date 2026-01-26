"use client";

import React from "react";

export function Input(
  props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }
) {
  const { className = "", label, hint, ...rest } = props;
  return (
    <label className="block">
      {label ? (
        <div className="mb-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
      ) : null}
      <input
        className={`w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-800 dark:bg-black dark:text-zinc-50 dark:focus:border-zinc-200 ${className}`}
        {...rest}
      />
      {hint ? <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{hint}</div> : null}
    </label>
  );
}

