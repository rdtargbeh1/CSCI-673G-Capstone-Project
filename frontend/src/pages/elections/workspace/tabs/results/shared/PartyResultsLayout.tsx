

// src/pages/elections/workspace/tabs/results/party/shared/PartyResultsLayout.tsx

import { NavLink, Outlet, useParams, useSearchParams } from "react-router-dom";

/**
 * RESULTS • PARTY • LAYOUT
 *
 * /elections/:electionId/results/party/*
 *
 * Candidates (Election/Counties/Districts/Centers)  |  Totals (Election/Counties/Districts/Centers)
 * contest-aware (contestId from query param)
 */

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function TabPill({
  to,
  label,
}: {
  to: string;
  label: string;
}) {
  return (
    <NavLink to={to} className={({ isActive }) => tabClass(isActive)}>
      {({ isActive }) => (
        <>
          {/* active dot */}
          <span
            className={[
              "h-2.5 w-2.5 rounded-full",
              isActive ? "bg-indigo-600" : "bg-slate-300",
            ].join(" ")}
          />
          <span>{label}</span>

          {/* subtle underline */}
          {isActive ? (
            <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function PartyResultsLayout() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  return (
    <div className="flex flex-col gap-3">
      {/* Header */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <div className="text-lg font-extrabold text-slate-900">
            Party Results
          </div>

          <div className="text-xs text-slate-600">
            Election: {electionId ?? "—"} • Contest: {contestId ?? "—"}
          </div>

          <div className="mt-1 text-xs text-slate-500">
            Tenant/Party computed results (verified submissions) scoped by contest.
          </div>
        </div>

        {/* ✅ ONE LINE NAV: Candidates (left) | Totals (right) */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          {/* Candidates LEFT */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700">
              Candidates:
            </span>
            <TabPill to="candidates/counties" label="Counties" />
            <TabPill to="candidates/districts" label="Districts" />
            <TabPill to="candidates/centers" label="Centers" />
             <TabPill to="candidates/election" label="Election" />
          </div>

          {/* Totals RIGHT */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700">
              Totals:
            </span>
            <TabPill to="totals/election" label="Election" />
            <TabPill to="totals/counties" label="Counties" />
            <TabPill to="totals/districts" label="Districts" />
            <TabPill to="totals/centers" label="Centers" />
          </div>
        </div>
      </div>

      {/* Child pages render here */}
      <Outlet />
    </div>
  );
}

