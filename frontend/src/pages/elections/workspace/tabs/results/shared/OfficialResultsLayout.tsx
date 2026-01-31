


import { useMemo } from "react";
import { NavLink, Outlet, useSearchParams } from "react-router-dom";

/**
 * RESULTS • OFFICIAL • LAYOUT
 *
 * Path:
 * /elections/:electionId/results/official/*
 *
 * - Title on top
 * - Candidates nav (LEFT)
 * - Totals nav (RIGHT)
 * - Geo nav (RIGHT, beside Totals)
 * - Contest-aware via query param
 */

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold transition",
    active
      ? "border-indigo-300 bg-indigo-50 text-indigo-900"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "h-2.5 w-2.5 rounded-full",
        active ? "bg-indigo-600" : "bg-slate-300",
      ].join(" ")}
    />
  );
}

export default function OfficialResultsLayout() {
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  const candidateTabs = useMemo(
    () => [
      { to: "candidates/election", label: "Election" },
      { to: "candidates/counties", label: "Counties" },
      { to: "candidates/districts", label: "Districts" },
      { to: "candidates/centers", label: "Centers" },
    ],
    []
  );

  const totalsTabs = useMemo(
    () => [
      { to: "totals/election", label: "Election" },
      { to: "totals/counties", label: "Counties" },
      { to: "totals/districts", label: "Districts" },
      { to: "totals/centers", label: "Centers" },
    ],
    []
  );

  // ✅ NEW: NEC Result Geo (official feed / map-ready data)
  const geoTabs = useMemo(() => [{ to: "geo", label: "NEC Geo" }], []);

  return (
    <div className="flex flex-col gap-3">
      {/* Header + Nav */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        {/* Title */}
        <div className="mb-3">
          <div className="text-lg font-extrabold text-slate-900">
            Official Results
          </div>
          <div className="text-xs text-slate-600">
            NEC-Published • Contest: {contestId ?? "—"}
          </div>
        </div>

        {/* Navigation row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* LEFT — Candidate nav */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-600">
              Candidates:
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {candidateTabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) => tabClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <ActiveDot active={isActive} />
                      <span>{t.label}</span>
                      {isActive && (
                        <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* RIGHT — Totals + Geo */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Totals nav */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-600">
                Totals:
              </span>

              <div className="flex flex-wrap items-center gap-2">
                {totalsTabs.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) => tabClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <ActiveDot active={isActive} />
                        <span>{t.label}</span>
                        {isActive && (
                          <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* ✅ Geo nav (compact, right side) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-extrabold text-slate-600">Geo:</span>

              <div className="flex flex-wrap items-center gap-2">
                {geoTabs.map((t) => (
                  <NavLink
                    key={t.to}
                    to={t.to}
                    className={({ isActive }) => tabClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <ActiveDot active={isActive} />
                        <span>{t.label}</span>
                        {isActive && (
                          <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Context hint */}
        <div className="mt-3 text-xs text-slate-500">
          These figures reflect <b>official NEC-published</b> results.
        </div>
      </div>

      {/* Child pages */}
      <Outlet />
    </div>
  );
}

