


// src/pages/elections/workspace/results/ResultsTab.tsx
/**
 * ELECTION WORKSPACE • RESULTS LAYOUT
 *
 * Tabs rules:
 * - TENANT: Vote Tally + Party + Compare + (Official only if NEC published)
 * - NEC:    Vote Tally + Official
 * - SYSTEM: Vote Tally + Official (platform/admin view)
 *
 * SYSTEM requires Organization selection to view tenant-scoped pages elsewhere,
 * but Results tabs are filtered by mode here.
 */

import { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";

import { useAuth } from "../../../../../../auth/useAuth";
import { apiClient } from "../../../../../../shared/lib/apiClient";
import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Badge, Panel } from "../../../../shared/elections-ui";

/* -------------------------------- helpers -------------------------------- */

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

type OrgLite = { orgId: string; orgName: string };

async function fetchSystemOrgs(): Promise<OrgLite[]> {
  const { data } = await apiClient.get("/platform/orgs", { params: { size: 500 } });
  if (Array.isArray(data)) return data;
  if (Array.isArray((data as any)?.items)) return (data as any).items;
  return [];
}

/**
 * ✅ Published check (contest-aware)
 * Expected backend shape: { published: boolean }
 * If error/unavailable => treat as NOT published for TENANT.
 */
async function fetchOfficialPublished(electionId: string, contestId?: string | null) {
  // Pick ONE endpoint that you have.
  // Example option A (recommended): /nec-results/published?electionId=...&contestId=...
  const { data } = await apiClient.get("/nec-results/published", {
    params: { electionId, contestId: contestId ?? undefined },
  });
  return Boolean((data as any)?.published);
}

export default function ResultsTab() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  const { dashboardMode } = useAuth();
  const mode = String(dashboardMode ?? "").toUpperCase(); // SYSTEM | NEC | TENANT

  const isSystem = mode === "SYSTEM";
  const isNec = mode === "NEC";
  const isTenant = mode === "TENANT";

  // SYSTEM org selector (keep as-is)
  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const [selectedOrgId, setSelectedOrgId] = useState<string>(currentOrgId ?? "");

  useEffect(() => {
    if ((currentOrgId ?? "") !== selectedOrgId) setSelectedOrgId(currentOrgId ?? "");
  }, [currentOrgId, selectedOrgId]);

  const orgsQ = useQuery({
    queryKey: ["system-orgs", "results"],
    queryFn: fetchSystemOrgs,
    enabled: isSystem,
    staleTime: 30_000,
    retry: 1,
  });

  // ✅ Published query: only needed for TENANT visibility
  const publishedQ = useQuery({
    queryKey: ["nec-results-published", electionId, contestId],
    queryFn: () => fetchOfficialPublished(String(electionId ?? ""), contestId),
    enabled: isTenant && !!electionId, // only tenants need this gate
    staleTime: 15_000,
    retry: 0,
  });

  // If tenant + not loaded/failed => default false (fail closed)
  const officialPublished = isTenant ? Boolean(publishedQ.data) : true;

  // ---- tab visibility rules ----
  const tallyVisible = true;

  // Party + Compare ONLY for TENANT
  const partyVisible = isTenant;
  const compareVisible = isTenant;

  // Official:
  // - NEC and SYSTEM always see it
  // - TENANT sees only if published
  const officialVisible = isNec || isSystem || (isTenant && officialPublished);

  const tabs = useMemo(
    () =>
      [
        { to: "tally", label: "Vote Tally", hidden: !tallyVisible },

        { to: "party", label: "Party", hidden: !partyVisible },

        { to: "official", label: "Official", hidden: !officialVisible },

        { to: "compare", label: "Compare", hidden: !compareVisible },
      ].filter((t) => !t.hidden),
    [tallyVisible, partyVisible, officialVisible, compareVisible]
  );

  const refreshAll = async () => {
    await Promise.allSettled([
      orgsQ.refetch(),
      publishedQ.refetch(), // safe even if disabled
    ]);
  };

  const onSelectOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    const st: any = useAuthStore.getState();
    if (typeof st.setCurrentOrgId === "function") st.setCurrentOrgId(orgId);
    else if (typeof st.setOrgId === "function") st.setOrgId(orgId);
  };

  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="Results"
        right={
          <div className="flex flex-wrap items-center justify-end gap-3">
            {/* SYSTEM org selector */}
            {isSystem ? (
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-slate-600">
                  Organization
                </span>

                <select
                  value={selectedOrgId}
                  onChange={(e) => onSelectOrg(e.target.value)}
                  className="h-10 min-w-[260px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
                >
                  <option value="">
                    {orgsQ.isLoading ? "Loading orgs…" : "Select organization"}
                  </option>
                  {(orgsQ.data ?? []).map((o) => (
                    <option key={o.orgId} value={o.orgId}>
                      {o.orgName}
                    </option>
                  ))}
                </select>

                <Badge text={selectedOrgId ? "Tenant scope" : "No org selected"} />
              </div>
            ) : (
              <Badge text={mode || "—"} />
            )}

            {/* ✅ Tabs with active indicator */}
            <div className="flex flex-wrap items-center gap-2">
              {tabs.map((t) => (
                <NavLink
                  key={t.to}
                  to={t.to}
                  className={({ isActive }) => tabClass(isActive)}
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          isActive ? "bg-indigo-600" : "bg-slate-300",
                        ].join(" ")}
                      />
                      <span>{t.label}</span>

                      {isActive ? (
                        <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                      ) : null}
                    </>
                  )}
                </NavLink>
              ))}
            </div>

            {/* Refresh */}
            <button
              type="button"
              onClick={refreshAll}
              disabled={orgsQ.isFetching || publishedQ.isFetching}
              className={[
                "inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold",
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
        {/* Tenant “Official not published” hint (only when tenant) */}
        {isTenant && !officialPublished ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="text-sm font-extrabold text-slate-800">
              Official results not published yet
            </div>
            <div className="mt-1 text-xs text-slate-600">
              The Official tab will appear after NEC publishes results for this contest.
            </div>
          </div>
        ) : null}

        {/* SYSTEM guard */}
        {isSystem && !selectedOrgId ? (
          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
            <div className="text-sm font-extrabold text-slate-800">
              Select an Organization
            </div>
            <div className="mt-1 text-xs text-slate-600">
              SYSTEM dashboard requires selecting an organization to view tenant results.
            </div>
          </div>
        ) : null}
      </Panel>

      <Outlet />
    </div>
  );
}

