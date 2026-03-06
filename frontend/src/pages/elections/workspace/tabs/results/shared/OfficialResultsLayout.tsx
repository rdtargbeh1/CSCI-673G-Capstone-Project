


import { useEffect, useMemo } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

/**
 * RESULTS • OFFICIAL • LAYOUT
 *
 * Path:
 * /elections/:electionId/results/official/*
 *
 * ✅ Default: Candidates → Centers
 */

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-lg font-extrabold transition",
    active
      ? "border-indigo-300 bg-indigo-50 text-indigo-900"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "h-2 w-2 rounded-full",
        active ? "bg-red-600" : "bg-slate-300",
      ].join(" ")}
    />
  );
}

export default function OfficialResultsLayout() {
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  const nav = useNavigate();
  const loc = useLocation();

  // ✅ Make Candidates/Centers the default when user lands on:
  // - .../official
  // - .../official/
  // - .../official/candidates
  // - .../official/candidates/
  useEffect(() => {
    const p = loc.pathname.replace(/\/+$/, ""); // trim trailing slash
    const isOfficialRoot = p.endsWith("/results/official");
    const isCandidatesRoot = p.endsWith("/results/official/candidates");

    if (isOfficialRoot || isCandidatesRoot) {
      // keep query params (contestId, etc.)
      nav("candidates/centers" + loc.search, { replace: true });
    }
  }, [loc.pathname, loc.search, nav]);

  // ✅ Reordered: Centers → Districts → Counties → Election
  const candidateTabs = useMemo(
    () => [
      { to: "candidates/centers", label: "Centers" },
      { to: "candidates/districts", label: "Districts" },
      { to: "candidates/counties", label: "Counties" },
      { to: "candidates/election", label: "Election" },
    ],
    []
  );

  // ✅ Reordered: Centers → Districts → Counties → Election
  const totalsTabs = useMemo(
    () => [
      { to: "totals/centers", label: "Centers" },
      { to: "totals/districts", label: "Districts" },
      { to: "totals/counties", label: "Counties" },
      { to: "totals/election", label: "Election" },
    ],
    []
  );

  const geoTabs = useMemo(() => [{ to: "geo", label: "NEC Geo" }], []);

  return (
    <div className="flex flex-col gap-2">
      {/* Header + Nav */}
      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
        {/* Title */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="text-base font-extrabold text-slate-900">
            Official Results
          </div>

          {contestId ? (
            <div className="text-[11px] font-semibold text-slate-500">
              Contest: {contestId}
            </div>
          ) : null}
        </div>

        {/* Navigation row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* LEFT — Candidate nav */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl font-extrabold text-red-600">
              Candidates Stats:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
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
                        <span className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-red-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* RIGHT — Totals + Geo */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Totals nav */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xl font-extrabold text-red-600">
                Geo Stats:
              </span>

              <div className="flex flex-wrap items-center gap-1.5">
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
                          <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-red-600" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Geo nav */}
            <div className="flex flex-wrap items-center gap-2">
              {/* <span className="text-lg font-extrabold text-slate-600">
                Geo:
              </span> */}

              <div className="flex flex-wrap items-center gap-1.5">
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
      </div>

      {/* Child pages */}
      <Outlet />
    </div>
  );
}

