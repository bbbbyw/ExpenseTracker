"use client";

import React from "react";

export function Button(
  props: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary" | "danger";
    size?: "sm" | "md" | "lg";
  }
) {
  const { className = "", variant = "primary", size = "md", ...rest } = props;
  const sizeClasses = {
    sm: "px-2 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  const base =
    `inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${sizeClasses[size]}`;
  const styles =
    variant === "primary"
      ? "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
      : variant === "danger"
        ? "bg-red-600 text-white hover:bg-red-500"
        : "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800";
  return <button className={`${base} ${styles} ${className}`} {...rest} />;
}

