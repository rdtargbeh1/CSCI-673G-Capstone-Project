


// ops-ui.tsx


/**
 * OPERATIONS UI SHARED (Tailwind)
 * PURPOSE:
 * - Consistent layout + components for operational pages.
 * - Queue-first UX for election day workflows.
 */

import React from "react";
import { NavLink } from "react-router-dom";

export function OpsPageShell({
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-base text-slate-600">{subtitle}</p>
          ) : null}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

export function OpsTabs() {
  const base = "rounded-xl border px-3 py-2 text-xl font-semibold";
  const active = "bg-[#00008B] border-slate-200 text-[#EFBF04] font-extrabold";
  const idle = "bg-white border-slate-200 hover:bg-slate-50";

  return (
    <div className="flex flex-wrap gap-2">
      <NavLink
        to="/operations/submissions"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Submissions
      </NavLink>
      <NavLink
        to="/operations/observer-reports"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Observer Reports
      </NavLink>
      <NavLink
        to="/operations/notifications"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Notifications
      </NavLink>

      <NavLink
        to="/operations/tally-sheets"
        className={({ isActive }) => `${base} ${isActive ? active : idle}`}
      >
        Tally Sheets
      </NavLink>
      
    </div>

    
  );
}

export function Card({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div className="font-extrabold">{title}</div>
        {right}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-base font-semibold text-slate-700">
      {children}
    </span>
  );
}

export function Note({ title, bullets }: { title: string; bullets: string[] }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3">
      <div className="font-extrabold">{title}</div>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-base text-slate-700">
        {bullets.map((b) => (
          <li key={b}>{b}</li>
        ))}
      </ul>
    </div>
  );
}

export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<string | number | React.ReactNode>>;
}) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap border-b border-slate-200 px-2 py-2 text-left text-base font-bold text-slate-600"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-slate-50">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className="whitespace-nowrap border-b border-slate-100 px-2 py-2 text-base text-slate-800"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatPill({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xl text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-extrabold">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-500">{hint}</div> : null}
    </div>
  );
}
