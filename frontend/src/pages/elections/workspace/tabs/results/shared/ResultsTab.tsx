// src/pages/elections/workspace/results/ResultsTab.tsx

import { useEffect, useMemo, useRef, useState } from "react";

import {
  NavLink,
  Outlet,
  useLocation,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
} from "lucide-react";

import { useAuth } from "../../../../../../auth/useAuth";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import { Badge, Panel } from "../../../../shared/elections-ui";

import {
  fetchOrganizations,
  type Organization,
} from "../../../../../../shared/services/organizationService";

import { necResultService } from "../../../../../../shared/services/necResultService";

// ============================================================================
// CONSTANTS
// ============================================================================

const EMPTY_ROLES: string[] = [];

// ============================================================================
// HELPERS
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
      px-3
      py-1.5
      text-sm
      font-bold
      transition
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

function normalizeRole(role: string) {
  const normalized = String(role ?? "")
    .toUpperCase()
    .trim();

  return normalized.startsWith("ROLE_") ? normalized.slice(5) : normalized;
}

function resolveMode(rawMode: string, roles: readonly string[]) {
  const mode = String(rawMode ?? "").toUpperCase();

  const normalizedRoles = roles.map(normalizeRole);

  const hasSystemRole = normalizedRoles.some(
    (role) => role.startsWith("SYSTEM_") || role === "SYSTEM",
  );

  const hasNecRole = normalizedRoles.some(
    (role) => role.startsWith("NEC_") || role === "NEC",
  );

  if (mode.includes("SYSTEM") || mode.includes("PLATFORM") || hasSystemRole) {
    return "SYSTEM";
  }

  if (mode.includes("NEC") || hasNecRole) {
    return "NEC";
  }

  if (mode.includes("TENANT")) {
    return "TENANT";
  }

  return "TENANT";
}

async function fetchSystemOrganizations(): Promise<Organization[]> {
  const response = await fetchOrganizations({
    page: 0,
    size: 500,
    active: true,
  });

  return response.items ?? [];
}

// ============================================================================
// PUBLISHED NOTICE
// ============================================================================

function InlinePublishedPill({ to }: { to: string }) {
  return (
    <div className="inline-flex max-w-[420px] items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5">
      <CheckCircle2 size={14} className="shrink-0 text-emerald-700" />

      <div
        className="min-w-0 flex-1 truncate text-xs font-bold text-emerald-900"
        title="NEC has published the official results."
      >
        Official results published
      </div>

      <NavLink
        to={to}
        className="shrink-0 rounded-md border border-emerald-200 bg-white px-2 py-1 text-xs font-bold text-emerald-900 hover:bg-emerald-100"
      >
        Open
      </NavLink>
    </div>
  );
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ResultsTab() {
  const queryClient = useQueryClient();

  const { electionId } = useParams();

  const location = useLocation();

  const [searchParams] = useSearchParams();

  const contestId = searchParams.get("contestId");

  // ==========================================================================
  // AUTH / MODE
  // ==========================================================================

  const { dashboardMode: dashboardModeAuth } = useAuth();

  const dashboardModeStore = useAuthStore((state: any) => state.dashboardMode);

  const dashboardMode = dashboardModeStore ?? dashboardModeAuth;

  const roles = useAuthStore((state: any) => {
    const values =
      state?.roles ??
      state?.me?.roles ??
      state?.user?.roles ??
      state?.authUser?.roles ??
      state?.profile?.roles ??
      EMPTY_ROLES;

    return Array.isArray(values) ? values : EMPTY_ROLES;
  });

  const mode = resolveMode(String(dashboardMode ?? ""), roles);

  const isSystem =
    String(dashboardMode ?? "").toUpperCase() === "SYSTEM" || mode === "SYSTEM";

  const isNec =
    String(dashboardMode ?? "").toUpperCase() === "NEC" || mode === "NEC";

  const isTenant = !isSystem && !isNec;

  // ==========================================================================
  // ORGANIZATION
  // ==========================================================================

  const selectedOrgId = useAuthStore((state: any) =>
    String(state.currentOrgId ?? ""),
  );

  const [systemSelectedOrgId, setSystemSelectedOrgId] =
    useState<string>(selectedOrgId);

  useEffect(() => {
    if (isSystem) {
      setSystemSelectedOrgId(selectedOrgId);
    }
  }, [isSystem, selectedOrgId]);

  const effectiveOrgId = isSystem ? systemSelectedOrgId : selectedOrgId;

  const systemOrgReady = !isSystem || Boolean(effectiveOrgId);

  const meOrgId = useAuthStore(
    (state: any) =>
      state?.me?.organization?.orgId ??
      state?.me?.orgId ??
      state?.tenant?.orgId ??
      state?.tenantMeta?.orgId ??
      "",
  );

  useEffect(() => {
    if ((isTenant || isNec) && !selectedOrgId && meOrgId) {
      const state: any = useAuthStore.getState();

      if (typeof state.setCurrentOrgId === "function") {
        state.setCurrentOrgId(String(meOrgId));
      } else if (typeof state.setOrgId === "function") {
        state.setOrgId(String(meOrgId));
      }
    }
  }, [isTenant, isNec, selectedOrgId, meOrgId]);

  // ==========================================================================
  // ORGANIZATIONS
  // ==========================================================================

  const organizationsQuery = useQuery({
    queryKey: ["system-orgs", "results"],

    queryFn: fetchSystemOrganizations,

    enabled: isSystem,

    staleTime: 30_000,

    retry: 1,
  });

  // ==========================================================================
  // PUBLISHED STATUS
  // ==========================================================================

  const publishedQuery = useQuery({
    queryKey: ["nec-election-published", electionId, contestId, effectiveOrgId],

    queryFn: () =>
      necResultService.isElectionPublished({
        electionId: String(electionId ?? ""),

        contestId,
      }),

    enabled: (isTenant || isSystem) && Boolean(electionId) && systemOrgReady,

    staleTime: 15_000,

    retry: 0,
  });

  const officialPublishedStrict = isNec ? true : publishedQuery.data === true;

  // ==========================================================================
  // TAB VISIBILITY
  // ==========================================================================

  const tallyVisible = true;

  const partyVisible = isTenant || isNec || (isSystem && systemOrgReady);

  const compareVisible = isTenant || (isSystem && systemOrgReady);

  const officialVisible =
    isNec ||
    ((isTenant || isSystem) && systemOrgReady && officialPublishedStrict);

  const tabs = useMemo(() => {
    if (isSystem && !effectiveOrgId) {
      return [];
    }

    return [
      {
        to: "submission-contest",

        label: "Submission Normalized",

        hidden: false,
      },

      {
        to: "tally",

        label: "Vote Tally",

        hidden: !tallyVisible,
      },

      {
        to: "party",

        label: "Local Results",

        hidden: !partyVisible,
      },

      {
        to: "official",

        label: "Official",

        hidden: !officialVisible,
      },

      {
        to: "compare",

        label: "Compare",

        hidden: !compareVisible,
      },
    ].filter((tab) => !tab.hidden);
  }, [
    isSystem,
    effectiveOrgId,
    tallyVisible,
    partyVisible,
    officialVisible,
    compareVisible,
  ]);

  // ==========================================================================
  // CURRENT TAB
  // ==========================================================================

  const currentTab = useMemo(() => {
    const pathname = location.pathname;

    return (
      tabs.find((tab) => pathname.includes(`/results/${tab.to}`)) ??
      tabs[0] ??
      null
    );
  }, [tabs, location.pathname]);

  // ==========================================================================
  // MOBILE NAV
  // ==========================================================================

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const mobileNavRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

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
  // ACTIONS
  // ==========================================================================

  const refreshAll = async () => {
    await Promise.allSettled([
      organizationsQuery.refetch(),
      publishedQuery.refetch(),
    ]);

    /*
     * Parent Results refresh should also refresh/invalidate
     * all child result queries.
     */
    await Promise.allSettled([
      queryClient.invalidateQueries({
        queryKey: ["normalize-search"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["vote-tally"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["party-results"],
      }),

      queryClient.invalidateQueries({
        queryKey: ["official-results"],
      }),
    ]);
  };

  const onSelectOrg = (orgId: string) => {
    setSystemSelectedOrgId(orgId);

    const state: any = useAuthStore.getState();

    if (typeof state.setCurrentOrgId === "function") {
      state.setCurrentOrgId(orgId);
    } else if (typeof state.setOrgId === "function") {
      state.setOrgId(orgId);
    }

    queryClient.invalidateQueries();

    queryClient.invalidateQueries({
      queryKey: ["nec-election-published"],
    });
  };

  const showPublishedErrorHint =
    systemOrgReady &&
    (isTenant || isSystem) &&
    Boolean(electionId) &&
    publishedQuery.isError;

  const showInlineTenantPublished =
    isTenant &&
    systemOrgReady &&
    Boolean(electionId) &&
    officialPublishedStrict === true;

  const officialTo = contestId
    ? `official?contestId=${encodeURIComponent(contestId)}`
    : "official";

  function tabDestination(tab: string) {
    return tab === "official" ? officialTo : tab;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="relative flex min-w-0 flex-col gap-2">
      {/* ====================================================================
          MOBILE RESULTS HEADER
      ==================================================================== */}

      <div
        ref={mobileNavRef}
        className={[
          "relative sm:hidden",

          mobileNavOpen ? "z-[300]" : "z-40",
        ].join(" ")}
      >
        <section className="rounded-xl border border-slate-200 bg-white px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-lg font-bold text-slate-900">Results</div>
            </div>

            {tabs.length > 0 && currentTab && (
              <button
                type="button"
                onClick={() => setMobileNavOpen((current) => !current)}
                className="
                    inline-flex
                    min-h-9
                    max-w-[210px]
                    items-center
                    justify-between
                    gap-1.5
                    rounded-lg
                    border
                    border-indigo-300
                    bg-indigo-50
                    px-2.5
                    py-1
                    text-[11px]
                    font-bold
                    text-indigo-800
                    shadow-sm
                  "
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 rounded-full bg-indigo-600" />

                  <span className="truncate">{currentTab.label}</span>
                </span>

                {mobileNavOpen ? (
                  <ChevronUp size={13} />
                ) : (
                  <ChevronDown size={13} />
                )}
              </button>
            )}
          </div>

          {/* ================================================================
              MOBILE MODE + REFRESH
          ================================================================ */}

          <div className="mt-2 flex items-center justify-between gap-2">
            <Badge text={String(dashboardMode ?? mode ?? "—")} />

            <button
              type="button"
              onClick={refreshAll}
              disabled={
                organizationsQuery.isFetching || publishedQuery.isFetching
              }
              className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw
                size={13}
                className={
                  organizationsQuery.isFetching || publishedQuery.isFetching
                    ? "animate-spin"
                    : ""
                }
              />
              Refresh
            </button>
          </div>
        </section>

        {/* ================================================================
            MOBILE DROPDOWN
        ================================================================ */}

        {mobileNavOpen && tabs.length > 0 && (
          <div className="absolute right-3 top-[52px] z-[400] w-[230px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-100 px-3 pb-1.5 pt-2.5 text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Results
            </div>

            {tabs.map((tab) => {
              const active = currentTab?.to === tab.to;

              const official = tab.to === "official";

              return (
                <NavLink
                  key={tab.to}
                  to={tabDestination(tab.to)}
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
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-700 hover:bg-slate-50",
                  ].join(" ")}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={[
                        "h-2 w-2 shrink-0 rounded-full",

                        official && officialPublishedStrict
                          ? "bg-emerald-500"
                          : active
                            ? "bg-indigo-600"
                            : "bg-slate-300",
                      ].join(" ")}
                    />

                    <span className="truncate">{tab.label}</span>
                  </span>

                  {active && (
                    <Check size={13} className="shrink-0 text-indigo-600" />
                  )}
                </NavLink>
              );
            })}
          </div>
        )}

        {/* ================================================================
            SYSTEM ORGANIZATION MOBILE
        ================================================================ */}

        {isSystem && (
          <div className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
            <select
              value={systemSelectedOrgId}
              onChange={(event) => onSelectOrg(event.target.value)}
              disabled={organizationsQuery.isLoading}
              className="min-h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
            >
              <option value="">
                {organizationsQuery.isLoading
                  ? "Loading organizations…"
                  : "Select organization"}
              </option>

              {(organizationsQuery.data ?? []).map((organization) => (
                <option key={organization.orgId} value={organization.orgId}>
                  {organization.orgName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ====================================================================
          DESKTOP RESULTS PANEL
      ==================================================================== */}

      <div className="hidden sm:block">
        <Panel
          title="Results"
          right={
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isSystem ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-600">
                    Organization
                  </span>

                  <select
                    value={systemSelectedOrgId}
                    onChange={(event) => onSelectOrg(event.target.value)}
                    disabled={organizationsQuery.isLoading}
                    className="h-9 min-w-[230px] rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
                  >
                    <option value="">
                      {organizationsQuery.isLoading
                        ? "Loading organizations…"
                        : "Select organization"}
                    </option>

                    {(organizationsQuery.data ?? []).map((organization) => (
                      <option
                        key={organization.orgId}
                        value={organization.orgId}
                      >
                        {organization.orgName}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <Badge text={String(dashboardMode ?? mode ?? "—")} />
              )}

              {tabs.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {tabs.map((tab) => (
                    <NavLink
                      key={tab.to}
                      to={tabDestination(tab.to)}
                      className={({ isActive }) => tabClass(isActive)}
                    >
                      {({ isActive }) => {
                        const official = tab.to === "official";

                        const dotClass =
                          official && officialPublishedStrict
                            ? "bg-emerald-500"
                            : isActive
                              ? "bg-indigo-600"
                              : "bg-slate-300";

                        return (
                          <>
                            <span
                              className={[
                                "h-2 w-2 rounded-full",
                                dotClass,
                              ].join(" ")}
                            />

                            <span>{tab.label}</span>
                          </>
                        );
                      }}
                    </NavLink>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={refreshAll}
                disabled={
                  organizationsQuery.isFetching || publishedQuery.isFetching
                }
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                <RefreshCw
                  size={14}
                  className={
                    organizationsQuery.isFetching || publishedQuery.isFetching
                      ? "animate-spin"
                      : ""
                  }
                />
                Refresh
              </button>
            </div>
          }
        >
          {/* ================================================================
              SYSTEM GATE
          ================================================================ */}

          {isSystem && !effectiveOrgId ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
              <div className="text-sm font-bold text-slate-800">
                Select an Organization to View Results
              </div>

              <div className="mt-0.5 text-xs text-slate-600">
                Choose the organization whose results you want to review.
              </div>
            </div>
          ) : null}

          {/* ================================================================
              PUBLISHED
          ================================================================ */}

          {showInlineTenantPublished && (
            <div className="mt-2">
              <InlinePublishedPill to={officialTo} />
            </div>
          )}

          {/* ================================================================
              PUBLISH ERROR
          ================================================================ */}

          {showPublishedErrorHint ? (
            <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className="mt-0.5 shrink-0 text-amber-700"
                  size={15}
                />

                <div>
                  <div className="text-sm font-bold text-amber-900">
                    Unable to verify publish status
                  </div>

                  <div className="mt-0.5 text-xs text-amber-800">
                    The official publication status could not be checked.
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </Panel>
      </div>

      {/* ====================================================================
          MOBILE NOTICES
      ==================================================================== */}

      <div className="sm:hidden">
        {showInlineTenantPublished && <InlinePublishedPill to={officialTo} />}

        {isSystem && !effectiveOrgId ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-sm font-bold text-slate-800">
              Select an Organization to View Results
            </div>

            <div className="mt-0.5 text-xs text-slate-600">
              Choose the organization whose results you want to review.
            </div>
          </div>
        ) : null}

        {showPublishedErrorHint ? (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle
                className="mt-0.5 shrink-0 text-amber-700"
                size={15}
              />

              <div>
                <div className="text-sm font-bold text-amber-900">
                  Unable to verify publish status
                </div>

                <div className="mt-0.5 text-xs text-amber-800">
                  The official publication status could not be checked.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* ====================================================================
          CHILD RESULT PAGE
      ==================================================================== */}

      {systemOrgReady ? (
        <Outlet
          context={{
            orgId: effectiveOrgId,
          }}
        />
      ) : null}
    </div>
  );
}
