

// src/pages/elections/workspace/tabs/results/party/shared/PartyResultsLayout.tsx

import {
  NavLink,
  Outlet,
  useOutletContext,
  useLocation,
  Navigate,
} from "react-router-dom";

/**
 * RESULTS • PARTY • LAYOUT
 *
 * /elections/:electionId/results/party/*
 *
 * Candidates (Centers/Districts/Counties/Election)  |  Totals (Centers/Districts/Counties/Election)
 * contest-aware (contestId from query param)
 */

/** ✅ ResultsTab passes this when nested under Results workspace */
type ResultsOutletCtx = { orgId?: string };

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-lg font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function TabPill({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => tabClass(isActive)}>
      {({ isActive }) => (
        <>
          {/* active dot */}
          <span
            className={[
              "h-2.5 w-2.5 rounded-full",
              isActive ? "bg-red-600" : "bg-slate-300",
            ].join(" ")}
          />
          <span>{label}</span>

          {/* subtle underline */}
          {isActive ? (
            <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-red-600" />
          ) : null}
        </>
      )}
    </NavLink>
  );
}

export default function PartyResultsLayout() {
  // ✅ IMPORTANT: forward ResultsTab outlet context (orgId) to nested pages
  const ctx = useOutletContext<ResultsOutletCtx>();

  // ✅ Default landing: /party -> /party/candidates/centers
  const { pathname } = useLocation();
  const isIndex = pathname.endsWith("/results/party") || pathname.endsWith("/results/party/");
  if (isIndex) {
    return <Navigate to="candidates/centers" replace />;
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Header (reduced padding/margins) */}
      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        <div className="text-2xl font-extrabold text-slate-900">Local Results</div>

        {/* ✅ ONE LINE NAV: Candidates (left) | Totals (right) */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {/* Candidates LEFT */}
          <div className="flex flex-wrap items-center gap-2">
            <span className=" text-xl font-extrabold text-red-700">Candidates Stats:</span>

            {/* ✅ ORDER: Centers (default), Districts, Counties, Election */}
            <TabPill to="candidates/centers" label="Centers" />
            <TabPill to="candidates/districts" label="Districts" />
            <TabPill to="candidates/counties" label="Counties" />
            <TabPill to="candidates/election" label="Election" />
          </div>

          {/* Totals RIGHT */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-extrabold text-red-700">Geo Stats:</span>

            {/* ✅ ORDER: Centers (default), Districts, Counties, Election */}
            <TabPill to="totals/centers" label="Centers" />
            <TabPill to="totals/districts" label="Districts" />
            <TabPill to="totals/counties" label="Counties" />
            <TabPill to="totals/election" label="Election" />
          </div>
        </div>
      </div>

      {/* ✅ Child pages render here — forward orgId context */}
      <Outlet context={ctx} />
    </div>
  );
}

