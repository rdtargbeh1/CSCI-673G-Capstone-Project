
// src/pages/dashboard/shared/dashboard-ui.ts


import React from "react";

/* =========================
   Grid
========================= */
export function Grid({
  columns = 4,
  children,
}: {
  columns?: 1 | 2 | 3 | 4;
  children: React.ReactNode;
}) {
  const cls =
    columns === 1
      ? "grid grid-cols-1 gap-4"
      : columns === 2
      ? "grid grid-cols-1 gap-4 md:grid-cols-2"
      : columns === 3
      ? "grid grid-cols-1 gap-4 lg:grid-cols-3"
      : "grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4";

  return <div className={cls}>{children}</div>;
}

/* =========================
   Stat Card
========================= */
export function StatCard({
  label,
  value,
  helper,
  right,
}: {
  label: string;
  value: string;
  helper?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border  border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-lg font-semibold  text-slate-700">{label}</div>
          <div className="mt-1 text-2xl text-center font-extrabold tracking-tight text-slate-900">
            {value}
          </div>
          {helper ? (
            <div className="mt-1 text-xs text-slate-500">{helper}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
    </div>
  );
}

/* =========================
   Panel
========================= */
export function Panel({
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
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm ">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 p-4">
        <div className="min-w-0">
          <div className="text-2xl font-extrabold text-slate-900">{title}</div>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-500">{subtitle}</div>
          ) : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/* =========================
   Simple Table
========================= */
export function SimpleTable({
  columns,
  rows,
  emptyText = "No data",
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyText?: string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="sticky top-0 bg-white px-3 py-2 text-left text-xs font-bold text-slate-600"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-sm text-slate-500"
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            rows.map((r, idx) => (
              <tr key={idx} className="border-t border-slate-100">
                {r.map((cell, j) => (
                  <td key={j} className="px-3 py-2 text-sm text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* =========================
   Chip
========================= */
export function Chip({
  text,
  tone = "slate",
}: {
  text: string;
  tone?: "slate" | "green" | "amber" | "red" | "blue";
}) {
  const cls =
    tone === "green"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : tone === "red"
      ? "border-red-200 bg-red-50 text-red-800"
      : tone === "blue"
      ? "border-blue-200 bg-blue-50 text-blue-800"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-xs font-bold ${cls}`}
    >
      {text}
    </span>
  );
}

/* =========================
   Trust Source Tag  ✅ NEW
========================= */
export function TrustSourceTag({ source }: { source?: string | null }) {
  const s = (source ?? "").toLowerCase();

  const tone =
    s.includes("nec") || s.includes("official")
      ? "green"
      : s.includes("agent") || s.includes("field")
      ? "blue"
      : s.includes("observer") || s.includes("media")
      ? "amber"
      : s
      ? "slate"
      : "red";

  return <Chip text={source ?? "Unknown"} tone={tone} />;
}
