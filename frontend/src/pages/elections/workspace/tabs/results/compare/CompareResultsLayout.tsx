

import { NavLink, Outlet, useSearchParams } from "react-router-dom";

function tabClass(active: boolean) {
  return [
    "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 shadow-sm"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

export default function CompareResultsLayout() {
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  return (
    <div className="flex flex-col gap-3">
      {/* Title + nav */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-extrabold text-slate-900">
              Compare Results
            </div>
            <div className="text-xs text-slate-600">
              Party (Tenant) vs Official (NEC){contestId ? ` • Contest: ${contestId}` : ""}
            </div>
          </div>

          {/* ✅ reduced width nav container */}
          <div className="flex flex-wrap items-center gap-2 max-w-[520px] justify-end">
            {/* ✅ MUST MATCH ROUTES: "candidates/counties" */}
            <NavLink
              to="candidates/counties"
              className={({ isActive }) => tabClass(isActive)}
            >
              Candidates • Counties
            </NavLink>

            {/* later:
                <NavLink to="candidates/districts" ...>Candidates • Districts</NavLink>
                <NavLink to="candidates/centers" ...>Candidates • Centers</NavLink>
                <NavLink to="totals/counties" ...>Totals • Counties</NavLink>
            */}
          </div>
        </div>
      </div>

      <Outlet />
    </div>
  );
}
