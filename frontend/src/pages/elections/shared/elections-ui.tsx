
// src/pages/elections/shared/elections-ui.tsx

/**
 * ELECTIONS UI SHARED COMPONENTS
 * PURPOSE:
 * - Shared layout primitives for Elections Hub + Workspace tabs.
 * - Keeps “Election Workspace” consistent and scalable.
 */

import React from "react";
import { NavLink, useLocation } from "react-router-dom";

export function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, color:  "#0000CD"}}>{title}</div>
      {subtitle && (
        <div style={{ fontSize: 18, color:  "#06089c", fontWeight: 500, opacity: 0.75, marginTop: 4 }}>
          {subtitle}
        </div>
      )}
    </div>
  );
}

export function WorkspaceHeader({
  electionName,
  meta,
  right,
}: {
  electionName: string;
  meta: string;
  right?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#fff",
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: 24, fontWeight: 900,color:  "#0000CD" }}>{electionName}</div>
          <div style={{ fontSize: 18, opacity: 0.75, marginTop: 4 }}>
            {meta}
          </div>
        </div>
        {right}
      </div>
    </div>
  );
}

export function TabsBar({
  tabs,
}: {
  tabs: Array<{ to: string; label: string; hidden?: boolean }>;
}) {
  const location = useLocation();
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {tabs
        .filter((t) => !t.hidden)
        .map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            style={({ isActive }) => ({
              textDecoration: "none",
              fontSize: 13,
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              background:
                isActive || location.pathname.endsWith(t.to)
                  ? "#f3f4f6"
                  : "#fff",
              color: "#111827",
              fontWeight: 700,
            })}
          >
            {t.label}
          </NavLink>
        ))}
    </div>
  );
}

export function Panel({
  title,
  right,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 14,
        background: "#fff",
      }}
    >
      <div
        style={{
          padding: 14,
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          alignItems: "center",
          fontSize: 20,
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 28, }}>{title}</div>
        {right}
      </div>
      <div style={{ padding: 14, fontSize: 20 }}>{children}</div>
    </section>
  );
}

export function Badge({ text }: { text: string }) {
  return (
    <span
      style={{
        fontSize: 16,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        // color: "#1304eb",
        fontWeight: 600,
      }}
    >
      {text}
    </span>
  );
}

export function ReadOnlyBanner({
  reason,
  sources,
}: {
  reason: string;
  sources: string[];
}) {
  return (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        borderRadius: 14,
        padding: 12,
        background: "#fafafa",
      }}
    >
      <div style={{ fontWeight: 900 }}>Read-only (Tenant View)</div>
      <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>{reason}</div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 6 }}>
        Data sources: {sources.join(", ")}
      </div>
    </div>
  );
}

export function PlaceholderNote({
  title,
  bullets,
}: {
  title: string;
  bullets: string[];
}) {
  return (
    <div
      style={{
        border: "1px dashed #cbd5e1",
        borderRadius: 12,
        padding: 12,
        background: "#fafafa",
        fontSize: 20,
      }}
    >
      <div style={{ fontWeight: 900, marginBottom: 6 }}>{title}</div>
      <ul style={{ margin: 0, paddingLeft: 24, fontSize: 16, opacity: 0.85 }}>
        {bullets.map((b) => (
          <li key={b} style={{ margin: "4px 0" }}>
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** ✅ FIX: allow icons/buttons in table cells */
export function SimpleTable({
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
                className="text-left text-lg font-semibold text-slate-600/80 whitespace-nowrap
                           px-2 py-2 border-b border-slate-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="align-middle">
              {r.map((cell, j) => (
                <td
                  key={j}
                  className="text-xl text-slate-900 whitespace-nowrap
                             px-2 py-1.5 border-b border-slate-100"
                >
                  {cell as any}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ElectionStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid #e5e7eb",
        background: "#fff",
        fontWeight: 700,
      }}
      title={active ? "Active election" : "Inactive election"}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: active ? "#16a34a" : "#dc2626", // green / red
        }}
      />
      {active ? "ACTIVE" : "INACTIVE"}
    </span>
  );
}
