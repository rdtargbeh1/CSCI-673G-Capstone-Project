import { useEffect, useMemo, useRef, useState } from "react";

import { Check, ChevronDown, ChevronUp } from "lucide-react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";

/**
 * ============================================================================
 * RESULTS • OFFICIAL • LAYOUT
 * ============================================================================
 *
 * Path:
 *
 * /elections/:electionId/results/official/*
 *
 * Default:
 *
 * candidates/centers
 *
 * Mobile:
 *
 * Shows only the current Official Results sub-tab with a Change dropdown.
 *
 * Desktop:
 *
 * Keeps the full Candidate Stats / Geo Stats navigation.
 * ============================================================================
 */

// ============================================================================
// TYPES
// ============================================================================

type OfficialTab = {
  to: string;

  label: string;

  group: "CANDIDATE" | "TOTALS" | "GEO";
};

// ============================================================================
// DESKTOP TAB CLASS
// ============================================================================

function tabClass(active: boolean) {
  return [
    `
      relative
      inline-flex
      min-h-9
      items-center
      gap-1.5
      rounded-lg
      border
      px-2.5
      py-1.5
      text-sm
      font-bold
      transition
    `,

    active
      ? `
          border-red-300
          bg-red-50
          text-red-900
        `
      : `
          border-slate-200
          bg-white
          text-slate-700
          hover:bg-slate-50
        `,
  ].join(" ");
}

// ============================================================================
// ACTIVE DOT
// ============================================================================

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

// ============================================================================
// COMPONENT
// ============================================================================

export default function OfficialResultsLayout() {
  const [searchParams] = useSearchParams();

  const contestId = searchParams.get("contestId");

  const navigate = useNavigate();

  const location = useLocation();

  // ==========================================================================
  // MOBILE NAV STATE
  // ==========================================================================

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  // ==========================================================================
  // DEFAULT ROUTE
  //
  // official
  // official/
  // official/candidates
  // official/candidates/
  //
  // -> official/candidates/centers
  // ==========================================================================

  useEffect(() => {
    const pathname = location.pathname.replace(/\/+$/, "");

    const isOfficialRoot = pathname.endsWith("/results/official");

    const isCandidatesRoot = pathname.endsWith("/results/official/candidates");

    if (isOfficialRoot || isCandidatesRoot) {
      navigate(
        `candidates/centers${location.search}`,

        {
          replace: true,
        },
      );
    }
  }, [location.pathname, location.search, navigate]);

  // ==========================================================================
  // TABS
  // ==========================================================================

  const candidateTabs = useMemo<OfficialTab[]>(
    () => [
      {
        to: "candidates/centers",

        label: "Centers",

        group: "CANDIDATE",
      },

      {
        to: "candidates/districts",

        label: "Districts",

        group: "CANDIDATE",
      },

      {
        to: "candidates/counties",

        label: "Counties",

        group: "CANDIDATE",
      },

      {
        to: "candidates/election",

        label: "Election",

        group: "CANDIDATE",
      },
    ],

    [],
  );

  const totalsTabs = useMemo<OfficialTab[]>(
    () => [
      {
        to: "totals/centers",

        label: "Centers",

        group: "TOTALS",
      },

      {
        to: "totals/districts",

        label: "Districts",

        group: "TOTALS",
      },

      {
        to: "totals/counties",

        label: "Counties",

        group: "TOTALS",
      },

      {
        to: "totals/election",

        label: "Election",

        group: "TOTALS",
      },
    ],

    [],
  );

  const geoTabs = useMemo<OfficialTab[]>(
    () => [
      {
        to: "geo",

        label: "NEC Geo",

        group: "GEO",
      },
    ],

    [],
  );

  const allTabs = useMemo(
    () => [...candidateTabs, ...totalsTabs, ...geoTabs],

    [candidateTabs, totalsTabs, geoTabs],
  );

  // ==========================================================================
  // CURRENT TAB
  // ==========================================================================

  const currentTab = useMemo(() => {
    const pathname = location.pathname;

    return (
      allTabs.find((tab) => pathname.includes(`/official/${tab.to}`)) ??
      candidateTabs[0]
    );
  }, [allTabs, candidateTabs, location.pathname]);

  // ==========================================================================
  // CURRENT GROUP LABEL
  // ==========================================================================

  const currentGroupLabel =
    currentTab.group === "CANDIDATE"
      ? "Candidate Stats"
      : currentTab.group === "TOTALS"
        ? "Geo Stats"
        : "NEC Geo";

  // ==========================================================================
  // PRESERVE QUERY STRING
  // ==========================================================================

  function tabDestination(to: string) {
    return `${to}${location.search}`;
  }

  // ==========================================================================
  // MOBILE MENU CLOSE ON ROUTE CHANGE
  // ==========================================================================

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  // ==========================================================================
  // CLOSE MOBILE MENU OUTSIDE
  // ==========================================================================

  useEffect(() => {
    if (!mobileNavOpen) {
      return;
    }

    const handleOutside = (event: MouseEvent) => {
      if (
        mobileNavRef.current &&
        !mobileNavRef.current.contains(event.target as Node)
      ) {
        setMobileNavOpen(false);
      }
    };

    window.addEventListener("mousedown", handleOutside);

    return () => window.removeEventListener("mousedown", handleOutside);
  }, [mobileNavOpen]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="relative flex min-w-0 flex-col gap-2">
      {/* ====================================================================
          MOBILE HEADER
      ==================================================================== */}

      <div ref={mobileNavRef} className="relative z-40 sm:hidden">
        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* TITLE */}

            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">
                Official Results
              </div>

              <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-red-500">
                {currentGroupLabel}
              </div>
            </div>

            {/* CURRENT TAB */}

            <button
              type="button"
              onClick={() => setMobileNavOpen((current) => !current)}
              className="
                inline-flex
                min-h-9
                max-w-[165px]
                items-center
                justify-between
                gap-1.5
                rounded-lg
                border
                border-red-300
                bg-red-50
                px-2.5
                py-1
                text-[11px]
                font-bold
                text-red-800
                shadow-sm
              "
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full bg-red-600" />

                <span className="truncate">{currentTab.label}</span>
              </span>

              {mobileNavOpen ? (
                <ChevronUp size={13} />
              ) : (
                <ChevronDown size={13} />
              )}
            </button>
          </div>
        </section>

        {/* ==================================================================
            MOBILE DROPDOWN
        ================================================================== */}

        {mobileNavOpen && (
          <div className="absolute right-3 top-[58px] z-[100] w-[225px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            {/* ==============================================================
                CANDIDATE STATS
            ============================================================== */}

            <div className="border-b border-slate-100 px-3 pb-1.5 pt-2.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
              Candidate Stats
            </div>

            {candidateTabs.map((tab) => {
              const active = currentTab.to === tab.to;

              return (
                <OfficialMobileOption
                  key={tab.to}
                  label={tab.label}
                  to={tabDestination(tab.to)}
                  active={active}
                />
              );
            })}

            {/* ==============================================================
                GEO STATS
            ============================================================== */}

            <div className="border-y border-slate-100 px-3 pb-1.5 pt-2.5 text-[9px] font-bold uppercase tracking-wider text-red-500">
              Geo Stats
            </div>

            {totalsTabs.map((tab) => {
              const active = currentTab.to === tab.to;

              return (
                <OfficialMobileOption
                  key={tab.to}
                  label={tab.label}
                  to={tabDestination(tab.to)}
                  active={active}
                />
              );
            })}

            {/* ==============================================================
                NEC GEO
            ============================================================== */}

            <div className="border-y border-slate-100 px-3 pb-1.5 pt-2.5 text-[9px] font-bold uppercase tracking-wider text-indigo-500">
              Geography
            </div>

            {geoTabs.map((tab) => {
              const active = currentTab.to === tab.to;

              return (
                <OfficialMobileOption
                  key={tab.to}
                  label={tab.label}
                  to={tabDestination(tab.to)}
                  active={active}
                  indigo
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ====================================================================
          DESKTOP HEADER
      ==================================================================== */}

      <div className="hidden rounded-xl border border-slate-200 bg-white px-3 py-2 sm:block">
        {/* TITLE */}

        <div className="mb-2">
          <div className="text-base font-bold text-slate-900">
            Official Results
          </div>
        </div>

        {/* ==================================================================
            NAVIGATION
        ================================================================== */}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* ================================================================
              CANDIDATE STATS
          ================================================================ */}

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-red-600">
              Candidate Stats:
            </span>

            <div className="flex flex-wrap items-center gap-1.5">
              {candidateTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tabDestination(tab.to)}
                  className={({ isActive }) => tabClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <ActiveDot active={isActive} />

                      <span>{tab.label}</span>

                      {isActive && (
                        <span className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-red-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* ================================================================
              GEO STATS + NEC GEO
          ================================================================ */}

          <div className="flex flex-wrap items-center gap-3">
            {/* GEO STATS */}

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-bold text-red-600">Geo Stats:</span>

              <div className="flex flex-wrap items-center gap-1.5">
                {totalsTabs.map((tab) => (
                  <NavLink
                    key={tab.to}
                    to={tabDestination(tab.to)}
                    className={({ isActive }) => tabClass(isActive)}
                  >
                    {({ isActive }) => (
                      <>
                        <ActiveDot active={isActive} />

                        <span>{tab.label}</span>

                        {isActive && (
                          <span className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-red-600" />
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* NEC GEO */}

            <div className="flex flex-wrap items-center gap-1.5">
              {geoTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tabDestination(tab.to)}
                  className={({ isActive }) => tabClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={[
                          "h-2 w-2 rounded-full",

                          isActive ? "bg-indigo-600" : "bg-slate-300",
                        ].join(" ")}
                      />

                      <span>{tab.label}</span>

                      {isActive && (
                        <span className="absolute -bottom-[1px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          CHILD PAGE
      ==================================================================== */}

      <Outlet />
    </div>
  );
}

// ============================================================================
// MOBILE OPTION
// ============================================================================

function OfficialMobileOption({
  label,
  to,
  active,
  indigo = false,
}: {
  label: string;

  to: string;

  active: boolean;

  indigo?: boolean;
}) {
  return (
    <NavLink
      to={to}
      className={[
        `
          flex
          min-h-10
          w-full
          items-center
          justify-between
          gap-3
          border-b
          border-slate-50
          px-3
          py-2
          text-left
          text-xs
          font-bold
          last:border-b-0
        `,

        active
          ? indigo
            ? "bg-indigo-50 text-indigo-700"
            : "bg-red-50 text-red-700"
          : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className={[
            "h-2 w-2 shrink-0 rounded-full",

            active ? (indigo ? "bg-indigo-600" : "bg-red-600") : "bg-slate-300",
          ].join(" ")}
        />

        <span className="truncate">{label}</span>
      </span>

      {active && (
        <Check
          size={13}
          className={
            indigo ? "shrink-0 text-indigo-600" : "shrink-0 text-red-600"
          }
        />
      )}
    </NavLink>
  );
}
