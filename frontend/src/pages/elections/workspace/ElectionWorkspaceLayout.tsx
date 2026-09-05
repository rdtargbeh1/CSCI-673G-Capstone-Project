/**
 * ELECTION WORKSPACE LAYOUT
 *
 * Mobile-first behavior:
 * - Compact election identity bar on phones
 * - Election actions collapsed behind an expandable menu
 * - Only current workspace section shown on phones
 * - Remaining workspace sections collapsed behind "Change"
 *
 * Desktop/tablet:
 * - Full election header
 * - Full workspace tab navigation
 *
 * Backend:
 * - GET /api/elections/{id}
 */

import { useEffect, useMemo, useRef, useState } from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";

import { useQuery } from "@tanstack/react-query";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Menu,
  RefreshCw,
  Repeat2,
  X,
} from "lucide-react";

import { useAuth } from "../../../auth/useAuth";

import { apiClient } from "../../../shared/lib/apiClient";

import {
  searchElections,
  type ElectionDto,
} from "../../../shared/services/electionService";

import { Badge, WorkspaceHeader } from "../shared/elections-ui";

// ============================================================================
// TYPES
// ============================================================================

type WorkspaceTab = {
  to: string;
  label: string;
  hidden: boolean;
};

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: any) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function swapElectionIdInPath(
  pathname: string,
  currentId: string,
  nextId: string,
) {
  const from = `/elections/${currentId}`;

  const to = `/elections/${nextId}`;

  if (pathname.startsWith(from)) {
    return pathname.replace(from, to);
  }

  return `/elections/${nextId}/overview`;
}

function statusDot(active: boolean) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        display: "inline-block",
        background: active ? "#16a34a" : "#dc2626",
        boxShadow: "0 0 0 2px rgba(255,255,255,0.9)",
      }}
    />
  );
}

async function fetchElectionById(id: string): Promise<ElectionDto> {
  const { data } = await apiClient.get<ElectionDto>(`/elections/${id}`);

  return data;
}

function isWorkspaceTabActive(
  pathname: string,
  electionId: string,
  tab: string,
) {
  const base = `/elections/${electionId}/${tab}`;

  return pathname === base || pathname.startsWith(`${base}/`);
}

// ============================================================================
// DESKTOP TAB
// ============================================================================

function tabClass(active: boolean) {
  return [
    `
      relative
      inline-flex
      shrink-0
      items-center
      gap-1.5

      min-h-10

      rounded-lg
      border

      px-2.5
      py-2

      text-xs
      font-extrabold

      transition

      sm:px-3
      sm:text-sm

      lg:text-base
    `,

    active
      ? `
          border-indigo-200
          bg-indigo-50
          text-indigo-900
          ring-1
          ring-indigo-100
        `
      : `
          border-slate-200
          bg-white
          text-slate-700
          hover:bg-slate-50
        `,
  ].join(" ");
}

function TabPill({ to, label }: { to: string; label: string }) {
  return (
    <NavLink to={to} className={({ isActive }) => tabClass(isActive)}>
      {({ isActive }) => (
        <>
          <span
            className={[
              "h-2 w-2 shrink-0 rounded-full",

              isActive ? "bg-indigo-600" : "bg-slate-300",
            ].join(" ")}
          />

          <span className="whitespace-nowrap">{label}</span>

          {isActive && (
            <span
              className="
                absolute
                -bottom-[2px]
                left-2
                right-2
                h-[2px]
                rounded-full
                bg-indigo-600
              "
            />
          )}
        </>
      )}
    </NavLink>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ElectionWorkspaceLayout() {
  const { electionId } = useParams();

  const eid = safeStr(electionId);

  const nav = useNavigate();

  const loc = useLocation();

  const { dashboardMode } = useAuth();

  const isNecOrSystem = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // ==========================================================================
  // UI STATE
  // ==========================================================================

  const [switchOpen, setSwitchOpen] = useState(false);

  const [mobileElectionOpen, setMobileElectionOpen] = useState(false);

  const [mobileWorkspaceOpen, setMobileWorkspaceOpen] = useState(false);

  const popRef = useRef<HTMLDivElement | null>(null);

  // ==========================================================================
  // DESKTOP SWITCH POPOVER OUTSIDE CLICK
  // ==========================================================================

  useEffect(() => {
    if (!switchOpen) {
      return;
    }

    const onDown = (event: MouseEvent) => {
      if (!popRef.current) {
        return;
      }

      if (!popRef.current.contains(event.target as Node)) {
        setSwitchOpen(false);
      }
    };

    window.addEventListener("mousedown", onDown);

    return () => window.removeEventListener("mousedown", onDown);
  }, [switchOpen]);

  // ==========================================================================
  // CLOSE MOBILE MENUS AFTER NAVIGATION
  // ==========================================================================

  useEffect(() => {
    setMobileWorkspaceOpen(false);
  }, [loc.pathname]);

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  const electionQ = useQuery({
    queryKey: ["election", "by-id", eid],

    queryFn: () => fetchElectionById(eid),

    enabled: Boolean(eid),

    staleTime: 15_000,

    retry: 1,
  });

  const activeElectionsQ = useQuery({
    queryKey: ["elections", "active-list"],

    queryFn: async () => {
      const res = await searchElections({
        page: 0,

        size: 200,

        q: undefined,

        year: undefined,

        type: undefined,

        active: true,
      });

      return res.items ?? [];
    },

    staleTime: 30_000,

    retry: 1,
  });

  const election = electionQ.data;

  // ==========================================================================
  // SWITCH OPTIONS
  // ==========================================================================

  const switchOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        value: string;
        label: string;
      }
    >();

    if (election?.electionId) {
      map.set(
        safeStr(election.electionId),

        {
          value: safeStr(election.electionId),

          label: `${safeStr(election.electionName)} • ${
            election.year
          } • ${safeStr(election.electionType)}${
            election.isActive ? "" : " • INACTIVE"
          }`,
        },
      );
    }

    const items = (activeElectionsQ.data ?? []) as ElectionDto[];

    for (const item of items) {
      const id = safeStr(item.electionId);

      if (!id) {
        continue;
      }

      if (!map.has(id)) {
        map.set(
          id,

          {
            value: id,

            label: `${safeStr(item.electionName)} • ${item.year} • ${safeStr(
              item.electionType,
            )}`,
          },
        );
      }
    }

    return Array.from(map.values());
  }, [activeElectionsQ.data, election]);

  // ==========================================================================
  // WORKSPACE TABS
  // ==========================================================================

  const tabs = useMemo(
    () =>
      (
        [
          {
            to: "overview",

            label: "Overview",

            hidden: false,
          },

          {
            to: "setup",

            label: "Setup",

            hidden: false,
          },

          {
            to: "allocation",

            label: "Allocation",

            hidden: false,
          },

          {
            to: "submissions",

            label: "Submissions",

            hidden: false,
          },

          {
            to: "results",

            label: "Results",

            hidden: false,
          },

          {
            to: "nec-workflow",

            label: "NEC Workflow",

            hidden: !isNecOrSystem,
          },
        ] satisfies WorkspaceTab[]
      ).filter((tab) => !tab.hidden),

    [isNecOrSystem],
  );

  // ==========================================================================
  // CURRENT WORKSPACE TAB
  // ==========================================================================

  const activeTab = useMemo(() => {
    const found = tabs.find((tab) =>
      isWorkspaceTabActive(loc.pathname, eid, tab.to),
    );

    return found ?? tabs[0];
  }, [tabs, loc.pathname, eid]);

  // ==========================================================================
  // REFRESH
  // ==========================================================================

  const refreshAll = async () => {
    await Promise.allSettled([electionQ.refetch(), activeElectionsQ.refetch()]);
  };

  // ==========================================================================
  // SWITCH ELECTION
  // ==========================================================================

  const switchElection = (nextId: string) => {
    if (!nextId || nextId === eid) {
      return;
    }

    const nextPath = swapElectionIdInPath(loc.pathname, eid, nextId);

    nav(nextPath);

    setSwitchOpen(false);

    setMobileElectionOpen(false);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div
      className="
        election-workspace
        flex
        w-full
        min-w-0
        flex-col
        gap-2

        sm:gap-3
      "
    >
      {/* ====================================================================
          MOBILE ELECTION HEADER
      ==================================================================== */}

      <section
        className="
          w-full
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white

          sm:hidden
        "
      >
        {/* PRIMARY ROW */}

        <div className="flex min-w-0 items-center gap-2 px-3 py-2.5">
          {/* ELECTION */}

          <div className="min-w-0 flex-1">
            <div
              className="
                truncate
                text-sm
                font-extrabold
                text-blue-800
              "
              title={election ? safeStr(election.electionName) : "Election"}
            >
              {election ? safeStr(election.electionName) : "Election"}
            </div>

            {election ? (
              <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[10px] font-medium text-slate-500">
                <span className="shrink-0">{election.year}</span>

                <span>•</span>

                <span className="truncate">
                  {safeStr(election.electionType)}
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-[10px] text-slate-400">Loading…</div>
            )}
          </div>

          {/* STATUS */}

          {election && (
            <span
              className="
                inline-flex
                min-h-8
                shrink-0
                items-center
                gap-1.5
                rounded-full
                border
                border-slate-200
                bg-white
                px-2.5
                text-[10px]
                font-extrabold
                text-slate-700
              "
            >
              {statusDot(Boolean(election.isActive))}

              {election.isActive ? "ACTIVE" : "INACTIVE"}
            </span>
          )}

          {/* ELECTION MENU */}

          <button
            type="button"
            onClick={() => setMobileElectionOpen((current) => !current)}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-700
              hover:bg-slate-50
            "
            aria-label="Election options"
          >
            {mobileElectionOpen ? <X size={17} /> : <Menu size={18} />}
          </button>
        </div>

        {/* COLLAPSED ELECTION ACTIONS */}

        {mobileElectionOpen && (
          <div className="border-t border-slate-200 bg-slate-50 px-3 py-3">
            <div className="grid grid-cols-2 gap-2">
              {/* BACK */}

              <button
                type="button"
                onClick={() => nav("/elections")}
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-xs
                  font-bold
                  text-slate-800
                "
              >
                <ArrowLeft size={15} />
                Elections
              </button>

              {/* REFRESH */}

              <button
                type="button"
                onClick={refreshAll}
                disabled={electionQ.isFetching || activeElectionsQ.isFetching}
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-slate-300
                  bg-white
                  px-3
                  text-xs
                  font-bold
                  text-slate-800
                  disabled:opacity-50
                "
              >
                <RefreshCw
                  size={15}
                  className={
                    electionQ.isFetching || activeElectionsQ.isFetching
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            </div>

            {/* SWITCH */}

            <div className="mt-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Switch Election
              </label>

              {activeElectionsQ.isLoading && !switchOptions.length ? (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-500">
                  Loading elections…
                </div>
              ) : activeElectionsQ.isError && !switchOptions.length ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-700">
                  Failed to load elections.
                </div>
              ) : (
                <div className="relative">
                  <Repeat2
                    size={15}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <select
                    value={eid}
                    onChange={(event) => switchElection(event.target.value)}
                    className="
                      min-h-11
                      w-full
                      rounded-lg
                      border
                      border-slate-300
                      bg-white
                      py-2
                      pl-9
                      pr-8
                      text-xs
                      font-bold
                      text-slate-800
                      outline-none
                      focus:border-blue-500
                      focus:ring-2
                      focus:ring-blue-100
                    "
                  >
                    {switchOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          DESKTOP / TABLET ELECTION HEADER
      ==================================================================== */}

      <div className="hidden sm:block">
        <WorkspaceHeader
          electionName={election ? safeStr(election.electionName) : "Election"}
          meta={
            election
              ? `Year: ${election.year} • Type: ${safeStr(
                  election.electionType,
                )} • Status: ${
                  election.isActive ? "ACTIVE" : "INACTIVE"
                } • ElectionId: ${safeStr(election.electionId)}`
              : eid
                ? `ElectionId: ${eid}`
                : "No election selected"
          }
          right={
            <div className="flex max-w-full flex-wrap items-center justify-end gap-1.5 sm:gap-2">
              {/* BACK */}

              <button
                type="button"
                onClick={() => nav("/elections")}
                title="Back to Elections list"
                className="
                  inline-flex
                  min-h-10
                  items-center
                  justify-center
                  gap-1.5
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-2
                  py-1.5
                  text-xs
                  font-extrabold
                  text-slate-900
                  hover:bg-slate-50
                  sm:min-h-11
                  sm:px-3
                  sm:text-sm
                  lg:text-base
                "
              >
                <ArrowLeft size={16} />

                <span>Back</span>
              </button>

              {/* STATUS */}

              {election ? (
                <span
                  title={
                    election.isActive ? "Active election" : "Inactive election"
                  }
                  className="
                    inline-flex
                    min-h-10
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-slate-200
                    bg-white
                    px-2
                    py-1.5
                    text-[11px]
                    font-extrabold
                    text-slate-800
                    sm:px-3
                    sm:text-xs
                  "
                >
                  {statusDot(Boolean(election.isActive))}

                  <span>{election.isActive ? "ACTIVE" : "INACTIVE"}</span>
                </span>
              ) : (
                <Badge text="Loading…" />
              )}

              {/* SWITCH ELECTION */}

              <div ref={popRef} className="relative">
                <button
                  type="button"
                  onClick={() => setSwitchOpen((current) => !current)}
                  title="Switch to another active election"
                  className="
                    inline-flex
                    min-h-10
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-2
                    py-1.5
                    text-xs
                    font-extrabold
                    text-slate-900
                    hover:bg-slate-50
                    sm:min-h-11
                    sm:px-3
                    sm:text-sm
                    lg:text-base
                  "
                >
                  <Repeat2 size={16} />

                  <span>Switch Election</span>
                </button>

                {switchOpen && (
                  <div
                    className="
                      absolute
                      right-0
                      top-[calc(100%+8px)]
                      z-50
                      w-[420px]
                      max-w-[80vw]
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      p-3
                      shadow-xl
                    "
                  >
                    <div className="text-base font-extrabold text-slate-900 sm:text-lg">
                      Switch election
                    </div>

                    <div className="mt-2">
                      {activeElectionsQ.isLoading && !switchOptions.length ? (
                        <div className="text-sm text-slate-600">
                          Loading elections…
                        </div>
                      ) : activeElectionsQ.isError && !switchOptions.length ? (
                        <div className="text-sm text-red-700">
                          {(activeElectionsQ.error as any)?.message ??
                            "Failed to load active elections."}
                        </div>
                      ) : (
                        <select
                          value={eid}
                          onChange={(event) =>
                            switchElection(event.target.value)
                          }
                          className="
                            h-11
                            w-full
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            px-3
                            text-sm
                            font-extrabold
                            text-slate-900
                          "
                        >
                          {switchOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="mt-2 text-xs leading-5 text-slate-500 sm:text-sm">
                      Active elections are available for quick switching.
                      Current election remains available even when inactive.
                    </div>
                  </div>
                )}
              </div>

              {/* REFRESH */}

              <button
                type="button"
                onClick={refreshAll}
                title="Refresh election header and active elections"
                disabled={electionQ.isFetching || activeElectionsQ.isFetching}
                className={[
                  `
                    inline-flex
                    min-h-10
                    items-center
                    justify-center
                    gap-1.5
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-2
                    py-1.5
                    text-xs
                    font-extrabold
                    text-slate-900
                    sm:min-h-11
                    sm:px-3
                    sm:text-sm
                  `,

                  electionQ.isFetching || activeElectionsQ.isFetching
                    ? "cursor-not-allowed opacity-60"
                    : "hover:bg-slate-50",
                ].join(" ")}
              >
                <RefreshCw
                  size={16}
                  className={
                    electionQ.isFetching || activeElectionsQ.isFetching
                      ? "animate-spin"
                      : ""
                  }
                />

                <span>Refresh</span>
              </button>
            </div>
          }
        />
      </div>

      {/* ====================================================================
          MOBILE WORKSPACE NAVIGATION
      ==================================================================== */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white

          sm:hidden
        "
      >
        {/* CURRENT SECTION */}

        <button
          type="button"
          onClick={() => setMobileWorkspaceOpen((current) => !current)}
          className="
            flex
            min-h-11
            w-full
            items-center
            justify-between
            gap-3
            px-3
            py-2
            text-left
          "
        >
          <div className="min-w-0">
            <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
              Election Workspace
            </div>

            <div className="mt-0.5 flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />

              <span className="truncate text-sm font-extrabold text-indigo-900">
                {activeTab?.label ?? "Workspace"}
              </span>
            </div>
          </div>

          <div
            className="
              inline-flex
              shrink-0
              items-center
              gap-1
              rounded-lg
              border
              border-slate-200
              bg-slate-50
              px-2.5
              py-1.5
              text-[11px]
              font-bold
              text-slate-700
            "
          >
            <span>Change</span>

            {mobileWorkspaceOpen ? (
              <ChevronUp size={14} />
            ) : (
              <ChevronDown size={14} />
            )}
          </div>
        </button>

        {/* WORKSPACE MENU */}

        {mobileWorkspaceOpen && (
          <div className="border-t border-slate-200 bg-slate-50 p-2">
            <div className="grid grid-cols-2 gap-2">
              {tabs.map((tab) => {
                const active = isWorkspaceTabActive(loc.pathname, eid, tab.to);

                return (
                  <NavLink
                    key={tab.to}
                    to={tab.to}
                    onClick={() => setMobileWorkspaceOpen(false)}
                    className={[
                      `
                          flex
                          min-h-11
                          items-center
                          gap-2
                          rounded-lg
                          border
                          px-3
                          py-2
                          text-xs
                          font-bold
                          transition
                        `,

                      active
                        ? `
                              border-indigo-300
                              bg-indigo-600
                              text-white
                            `
                        : `
                              border-slate-200
                              bg-white
                              text-slate-700
                              hover:bg-slate-100
                            `,
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-2 w-2 shrink-0 rounded-full",

                        active ? "bg-white" : "bg-slate-300",
                      ].join(" ")}
                    />

                    <span className="truncate">{tab.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* ====================================================================
          DESKTOP / TABLET WORKSPACE NAVIGATION
      ==================================================================== */}

      <div
        className="
          hidden
          w-full
          min-w-0
          rounded-xl
          border
          border-slate-200
          bg-white
          px-3
          py-2

          sm:block
        "
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 lg:gap-2">
            {tabs.map((tab) => (
              <TabPill key={tab.to} to={tab.to} label={tab.label} />
            ))}
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <Badge text={safeStr(dashboardMode || "—")} />
          </div>
        </div>
      </div>

      {/* ====================================================================
          ROUTED ELECTION CONTENT
      ==================================================================== */}

      <div className="w-full min-w-0">
        {electionQ.isError && (
          <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800 sm:mb-3">
            {(electionQ.error as any)?.message ??
              "Failed to load election header."}
          </div>
        )}

        <Outlet />
      </div>
    </div>
  );
}
