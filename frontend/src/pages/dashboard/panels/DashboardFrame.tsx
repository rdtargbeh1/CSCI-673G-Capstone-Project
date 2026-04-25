// dashboard/panels/DashboardFrame.tsx

import React from "react";

export default function DashboardFrame({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-2xl font-extrabold tracking-tight text-slate-900">
            {title}
          </div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      {children}
    </div>
  );
}
