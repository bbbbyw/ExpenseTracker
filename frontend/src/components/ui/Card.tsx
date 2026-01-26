import React from "react";

export function Card({
  title,
  children,
  actions,
}: {
  title?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl mb-3 border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-black">
      {(title || actions) && (
        <div className="mb-4 flex items-start justify-between gap-4">
          {title ? <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">{title}</h2> : <div />}
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
      )}
      {children}
    </div>
  );
}

