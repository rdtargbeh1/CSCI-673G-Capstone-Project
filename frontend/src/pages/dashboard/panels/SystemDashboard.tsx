
// src/pages/dashboard/panels/SystemDashboard.tsx

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DashboardFrame from "../panels/DashboardFrame";
import DashboardTabs from "../shared/DashboardTabs";
import LocalResultsDashboard from "../modes/LocalResultsDashboard";
import OfficialResultsDashboard from "../modes/OfficialResultsDashboard";
import {
  Grid,
  Panel,
  SimpleTable,
  StatCard,
  Chip,
} from "../shared/dashboard-ui";
import { useAuthStore } from "../../../shared/store/authStore";
import {
  fetchSystemOrgCount,
  fetchSystemElectionsCount,
  fetchSystemElectionsPreview,
} from "../../../shared/services/statsService";
import {
  fetchOrganizations,
} from "../../../shared/services/organizationService";

type DashboardView = "home" | "local-results" | "official-results";

export default function SystemDashboard() {
  const qc = useQueryClient();
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [currentView, setCurrentView] = useState<DashboardView>("home");

  const orgCountQ = useQuery({
    queryKey: ["system", "orgCount"],
    queryFn: fetchSystemOrgCount,
  });

  const electionsCountQ = useQuery({
    queryKey: ["system", "electionsCount"],
    queryFn: fetchSystemElectionsCount,
  });

  const electionsPreviewQ = useQuery({
    queryKey: ["system", "electionsPreview"],
    queryFn: fetchSystemElectionsPreview,
  });

  // ✅ Fetch organizations for dropdown
  const orgsQ = useQuery({
    queryKey: ["system", "organizations"],
    queryFn: () =>
      fetchOrganizations({
        page: 0,
        size: 500,
        active: true,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  const orgCount = orgCountQ.data ?? 0;
  const electionsCount = electionsCountQ.data ?? 0;
  const electionsRows = (electionsPreviewQ.data?.content ?? []).map(
    (e: any) => [
      <div className="font-semibold text-slate-900">
        {e.electionName ?? "—"}
      </div>,
      <span className="text-slate-700">{e.year ?? "—"}</span>,
      <Chip
        text={String(e.isActive ? "ACTIVE" : "INACTIVE")}
        tone={e.isActive ? "green" : "slate"}
      />,
    ]
  );

  // ✅ Handle organization selection
  const handleSelectOrg = (orgId: string) => {
    setSelectedOrgId(orgId);
    setCurrentView("home"); // Reset view when changing org

    // ✅ Update auth store so child components can use it
    const st: any = useAuthStore.getState();
    if (typeof st.setCurrentOrgId === "function") st.setCurrentOrgId(orgId);
    else if (typeof st.setOrgId === "function") st.setOrgId(orgId);

    // ✅ Invalidate queries so child components refetch with new orgId
    qc.invalidateQueries();
  };

  // ✅ Handle Home button click - clear organization selection
  const handleClickHome = () => {
    setCurrentView("home");
    setSelectedOrgId(""); // ✅ Clear organization selection
    
    // ✅ Clear auth store organization
    const st: any = useAuthStore.getState();
    if (typeof st.setCurrentOrgId === "function") st.setCurrentOrgId("");
    else if (typeof st.setOrgId === "function") st.setOrgId("");

    // ✅ Invalidate queries to reset dashboard
    qc.invalidateQueries();
  };

  // ✅ Get current organization name for display
  const currentOrg = useMemo(
    () => (orgsQ.data?.items ?? []).find((o) => o.orgId === selectedOrgId),
    [orgsQ.data, selectedOrgId]
  );

  // ✅ Show home dashboard by default, or results dashboard if org is selected
  const showResultsDashboard = !!selectedOrgId;

  return (
    <>
      {/* ✅ Show tabs only when organization is selected and viewing results */}
      {showResultsDashboard && currentView !== "home" && (
        <DashboardTabs
          mode="SYSTEM"
          currentOrgId={selectedOrgId ?? undefined}
          isOfficialPublished={true}
        />
      )}

      <DashboardFrame
        title={
          showResultsDashboard
            ? `System Results - ${currentOrg?.orgName ?? "Organization"}`
            : "System Admin Dashboard"
        }
        subtitle={
          showResultsDashboard
            ? `Viewing results for: ${currentOrg?.orgName ?? "—"}`
            : "Platform-wide observability across tenants, elections, and operations."
        }
        right={
          <div className="flex flex-wrap items-center gap-3">
            {/* ✅ Organization selector */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-slate-600">
                Organization
              </span>

              <select
                value={selectedOrgId}
                onChange={(e) => handleSelectOrg(e.target.value)}
                disabled={orgsQ.isLoading}
                className={[
                  "h-10 min-w-[260px] rounded-xl border bg-white px-3 text-sm font-bold",
                  orgsQ.isLoading ? "border-slate-200 opacity-70" : "border-slate-200",
                ].join(" ")}
              >
                <option value="">
                  {orgsQ.isLoading ? "Loading organizations…" : "Select organization"}
                </option>

                {(orgsQ.data?.items ?? []).map((o) => (
                  <option key={o.orgId} value={o.orgId}>
                    {o.orgName}
                  </option>
                ))}
              </select>

              <Chip
                text={selectedOrgId ? "Org selected" : "Select org to view results"}
                tone={selectedOrgId ? "green" : "slate"}
              />
            </div>

            {/* ✅ View navigation tabs (shown when org is selected) */}
            {showResultsDashboard && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleClickHome}
                  className={`px-3 py-2 text-sm font-bold rounded-xl border transition ${
                    currentView === "home" && showResultsDashboard
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 inline-block mr-2" />
                  Home
                </button>

                <button
                  onClick={() => setCurrentView("local-results")}
                  className={`px-3 py-2 text-sm font-bold rounded-xl border transition ${
                    currentView === "local-results"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block mr-2" />
                  Local Results
                </button>

                <button
                  onClick={() => setCurrentView("official-results")}
                  className={`px-3 py-2 text-sm font-bold rounded-xl border transition ${
                    currentView === "official-results"
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-300 inline-block mr-2" />
                  Official Results
                </button>
              </div>
            )}

            <Chip text="SYSTEM" tone="blue" />
          </div>
        }
      >
        {/* ✅ HOME VIEW: Platform overview */}
        {!showResultsDashboard || currentView === "home" ? (
          <>
            <Grid columns={4}>
              <StatCard
                label="Organizations"
                value={`${orgCount}`}
                helper="organization"
              />
              <StatCard
                label="Elections"
                value={`${electionsCount}`}
                helper="election"
              />
              <StatCard
                label="Security"
                value="View"
                helper="MFA, sessions, signing keys"
              />
              <StatCard
                label="Audit & Alerts"
                value="View"
                helper="activity + notifications"
              />
            </Grid>

            <Grid columns={2}>
              <Panel title="Recent Elections" subtitle="Read-only snapshot">
                <SimpleTable
                  columns={["Election", "Year", "Status"]}
                  rows={electionsRows}
                  emptyText="No elections"
                />
              </Panel>

              <Panel
                title="How to use System Dashboard"
                subtitle="Platform administration + monitoring"
              >
                <div className="space-y-2 text-sm text-slate-700">
                  <div>
                    • Select an organization from the dropdown to view its results
                  </div>
                  <div>
                    • Navigate between Home, Local Results, and Official Results
                  </div>
                  <div>
                    • Click Home button to return to platform overview and clear organization selection
                  </div>
                  <div>
                    • Monitor integrity signals (failures, retries, suspicious auth)
                  </div>
                </div>
              </Panel>
            </Grid>
          </>
        ) : null}

        {/* ✅ LOCAL RESULTS VIEW: Shows LocalResultsDashboard for selected org */}
        {showResultsDashboard && currentView === "local-results" ? (
          <LocalResultsDashboard mode="SYSTEM" />
        ) : null}

        {/* ✅ OFFICIAL RESULTS VIEW: Shows OfficialResultsDashboard for selected org */}
        {showResultsDashboard && currentView === "official-results" ? (
          <OfficialResultsDashboard mode="SYSTEM" />
        ) : null}
      </DashboardFrame>
    </>
  );
}

