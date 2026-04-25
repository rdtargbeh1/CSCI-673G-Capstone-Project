
// ✅ UPDATED FILE: src/pages/elections/workspace/results/ResultsTab.tsx
/**
 * ELECTION WORKSPACE • RESULTS LAYOUT
 *
 * Tabs rules:
 * - TENANT: Vote Tally + Party + Compare + (Official only if NEC published)
 * - NEC:    Vote Tally + Party + Official
 * - SYSTEM: Must select Organization first, then:
 *           Vote Tally + Local Results + Compare + (Official only if NEC published)
 */

import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react";

import { useAuth } from "../../../../../../auth/useAuth";
import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Badge, Panel } from "../../../../shared/elections-ui";

import {
  fetchOrganizations,
  type Organization,
} from "../../../../../../shared/services/organizationService";

import { necResultService } from "../../../../../../shared/services/necResultService";

/* ------------------------------- constants ------------------------------- */

const EMPTY_ROLES: string[] = [];

/* -------------------------------- helpers -------------------------------- */

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xl font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function normalizeRole(r: string) {
  const x = String(r ?? "").toUpperCase().trim();
  return x.startsWith("ROLE_") ? x.slice(5) : x;
}

function resolveMode(rawMode: string, roles: readonly string[]) {
  const m = String(rawMode ?? "").toUpperCase();
  const norm = roles.map(normalizeRole);

  const hasSystemRole = norm.some((r) => r.startsWith("SYSTEM_") || r === "SYSTEM");
  const hasNecRole = norm.some((r) => r.startsWith("NEC_") || r === "NEC");

  if (m.includes("SYSTEM") || m.includes("PLATFORM") || hasSystemRole) return "SYSTEM";
  if (m.includes("NEC") || hasNecRole) return "NEC";
  if (m.includes("TENANT")) return "TENANT";

  return "TENANT";
}

async function fetchSystemOrganizations(): Promise<Organization[]> {
  const res = await fetchOrganizations({ page: 0, size: 500, active: true });
  return res.items ?? [];
}

function InlinePublishedPill({ to }: { to: string }) {
  // ✅ Compact “inline alert” that sits ON THE SAME LINE as the nav tabs
  // ✅ Avoids wide/long arrow look by truncating text
  return (
    <div className="ml-2 inline-flex max-w-[520px] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2">
      <CheckCircle2 size={16} className="text-emerald-700" />
      <div className="min-w-0">
        <div
          className="truncate text-sm font-extrabold text-emerald-900"
          title="NEC has published the official results — open the Official tab to view the certified totals for this contest."
        >
          NEC published official results — open Official to view certified totals.
        </div>
      </div>

      <NavLink
        to={to}
        className="shrink-0 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-[14px] font-extrabold text-emerald-900 hover:bg-emerald-100"
      >
        Open
      </NavLink>
    </div>
  );
}

export default function ResultsTab() {
  const qc = useQueryClient();
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  const { dashboardMode: dashboardModeAuth } = useAuth();
  const dashboardModeStore = useAuthStore((s: any) => s.dashboardMode);
  const dashboardMode = dashboardModeStore ?? dashboardModeAuth;

  const roles = useAuthStore((s: any) => {
    const r =
      s?.roles ??
      s?.me?.roles ??
      s?.user?.roles ??
      s?.authUser?.roles ??
      s?.profile?.roles ??
      EMPTY_ROLES;
    return Array.isArray(r) ? r : EMPTY_ROLES;
  });

  const mode = resolveMode(String(dashboardMode ?? ""), roles);

  const isSystem =
    String(dashboardMode ?? "").toUpperCase() === "SYSTEM" || mode === "SYSTEM";
  const isNec = String(dashboardMode ?? "").toUpperCase() === "NEC" || mode === "NEC";
  const isTenant = !isSystem && !isNec;

  const selectedOrgId = useAuthStore((s: any) => String(s.currentOrgId ?? ""));
  const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>(selectedOrgId);

  useEffect(() => {
    if (isSystem) setSystemSelectedOrgId(selectedOrgId);
  }, [isSystem, selectedOrgId]);

  const effectiveOrgId = isSystem ? systemSelectedOrgId : selectedOrgId;
  const systemOrgReady = !isSystem || !!effectiveOrgId;

  const meOrgId = useAuthStore((s: any) => {
    return (
      s?.me?.organization?.orgId ??
      s?.me?.orgId ??
      s?.tenant?.orgId ??
      s?.tenantMeta?.orgId ??
      ""
    );
  });

  useEffect(() => {
    if ((isTenant || isNec) && !selectedOrgId && meOrgId) {
      const st: any = useAuthStore.getState();
      if (typeof st.setCurrentOrgId === "function") st.setCurrentOrgId(String(meOrgId));
      else if (typeof st.setOrgId === "function") st.setOrgId(String(meOrgId));
    }
  }, [isTenant, isNec, selectedOrgId, meOrgId]);

  const orgsQ = useQuery({
    queryKey: ["system-orgs", "results"],
    queryFn: fetchSystemOrganizations,
    enabled: isSystem,
    staleTime: 30_000,
    retry: 1,
  });

  const publishedQ = useQuery({
    queryKey: ["nec-election-published", electionId, contestId, effectiveOrgId],
    queryFn: () =>
      necResultService.isElectionPublished({
        electionId: String(electionId ?? ""),
        contestId,
      }),
    enabled: (isTenant || isSystem) && !!electionId && systemOrgReady,
    staleTime: 15_000,
    retry: 0,
  });

  const officialPublishedStrict = isNec ? true : publishedQ.data === true;

  const tallyVisible = true;
  const partyVisible = isTenant || isNec || (isSystem && systemOrgReady);
  const compareVisible = isTenant || (isSystem && systemOrgReady);

  const officialVisible =
    isNec || ((isTenant || isSystem) && systemOrgReady && officialPublishedStrict);

  const tabs = useMemo(() => {
    if (isSystem && !effectiveOrgId) return [];
    return [
      // ✅ NEW: Submission Contest is the default/first tab
      { to: "submission-contest", label: "Submission Normalized", hidden: false },

      { to: "tally", label: "Vote Tally", hidden: !tallyVisible },
      { to: "party", label: "Local Results", hidden: !partyVisible },
      { to: "official", label: "Official", hidden: !officialVisible },
      { to: "compare", label: "Compare", hidden: !compareVisible },
    ].filter((t) => !t.hidden);
  }, [
    isSystem,
    effectiveOrgId,
    tallyVisible,
    partyVisible,
    officialVisible,
    compareVisible,
  ]);

  const refreshAll = async () => {
    await Promise.allSettled([orgsQ.refetch(), publishedQ.refetch()]);
  };

  const onSelectOrg = (orgId: string) => {
    setSystemSelectedOrgId(orgId);

    const st: any = useAuthStore.getState();
    if (typeof st.setCurrentOrgId === "function") st.setCurrentOrgId(orgId);
    else if (typeof st.setOrgId === "function") st.setOrgId(orgId);

    qc.invalidateQueries();
    qc.invalidateQueries({ queryKey: ["nec-election-published"] });
  };

  const showPublishedErrorHint =
    systemOrgReady && (isTenant || isSystem) && !!electionId && publishedQ.isError;

  // ✅ Show inline alert only for TENANT when published
  const showInlineTenantPublished =
    isTenant && systemOrgReady && !!electionId && officialPublishedStrict === true;

  // ✅ keep contestId when jumping to Official
  const officialTo = contestId
    ? `official?contestId=${encodeURIComponent(contestId)}`
    : "official";

  return (
    <div className="flex flex-col gap-2">
      <Panel
        title="Results"
        right={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {isSystem ? (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                <span className="text-base font-extrabold text-slate-600">Organization</span>

                <select
                  value={systemSelectedOrgId}
                  onChange={(e) => onSelectOrg(e.target.value)}
                  disabled={orgsQ.isLoading}
                  className={[
                    "h-10 min-w-[260px] rounded-xl border bg-white px-3 text-base font-bold",
                    orgsQ.isLoading ? "border-slate-200 opacity-70" : "border-slate-200",
                  ].join(" ")}
                >
                  <option value="">
                    {orgsQ.isLoading ? "Loading organizations…" : "Select organization"}
                  </option>

                  {(orgsQ.data ?? []).map((o) => (
                    <option key={o.orgId} value={o.orgId}>
                      {o.orgName}
                    </option>
                  ))}
                </select>

                <Badge text={effectiveOrgId ? "Org selected" : "Select org to view results"} />
              </div>
            ) : (
              <Badge text={String(dashboardMode ?? mode ?? "—")} />
            )}

            {/* ✅ NAV TABS + INLINE ALERT (same row) */}
            {tabs.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {tabs.map((t) => (
                  <NavLink key={t.to} to={t.to} className={({ isActive }) => tabClass(isActive)}>
                    {({ isActive }) => {
                      const isOfficial = t.to === "official";
                      const officialGreen = isOfficial && officialPublishedStrict;

                      const dotClass = officialGreen
                        ? "bg-emerald-500"
                        : isActive
                        ? "bg-indigo-600"
                        : "bg-slate-300";

                      return (
                        <>
                          <span className={["h-2.5 w-2.5 rounded-full", dotClass].join(" ")} />
                          <span>{t.label}</span>
                        </>
                      );
                    }}
                  </NavLink>
                ))}

                {/* ✅ inline alert appears directly beside tabs (no long wide bar above) */}
                {showInlineTenantPublished ? <InlinePublishedPill to={officialTo} /> : null}
              </div>
            ) : null}

            <button
              type="button"
              onClick={refreshAll}
              disabled={orgsQ.isFetching || publishedQ.isFetching}
              className={[
                "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-extrabold",
                orgsQ.isFetching || publishedQ.isFetching
                  ? "opacity-60 cursor-not-allowed"
                  : "hover:bg-slate-50",
              ].join(" ")}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      >
        {/* ✅ SYSTEM gate (kept minimal) */}
        {isSystem && !effectiveOrgId ? (
          <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <div className="text-lg font-extrabold text-slate-800">
              Select an Organization to View Results
            </div>
            <div className="mt-0.5 text-base text-slate-600">
              SYSTEM users do not submit votes. Choose the organization whose results you want to
              review.
            </div>
          </div>
        ) : null}

        {showPublishedErrorHint ? (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 text-amber-700" size={16} />
              <div>
                <div className="text-base font-extrabold text-amber-900">
                  Unable to verify publish status
                </div>
                <div className="mt-0.5 text-sm text-amber-800">
                  Fix backend: allow TENANT to call the published-check endpoint used here.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </Panel>

      {/* ✅ hard gate: don’t render child routes until SYSTEM selects org
          ✅ pass effective orgId to children (Submissions-style) */}
      {systemOrgReady ? <Outlet context={{ orgId: effectiveOrgId }} /> : null}
    </div>
  );
}



