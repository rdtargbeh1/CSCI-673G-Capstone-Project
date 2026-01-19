import { useQuery } from "@tanstack/react-query";
import DashboardFrame from "../panels/DashboardFrame";
import {
  Grid,
  Panel,
  SimpleTable,
  StatCard,
  Chip,
} from "../shared/dashboard-ui";

import { apiClient } from "../../../shared/lib/apiClient";

async function fetchOrgCount() {
  // org controller exists: GET /api/orgs?page=&size=&q=&active=&type=
  const res = await apiClient.get<any>("/orgs", {
    params: { page: 0, size: 1 },
  });
  // Spring Page
  return res.data?.totalElements ?? 0;
}

async function fetchElectionsCount() {
  // From your UI spec you have /api/elections page endpoint (adjust if needed)
  const res = await apiClient.get<any>("/elections", {
    params: { page: 0, size: 1 },
  });
  return res.data?.totalElements ?? 0;
}

async function fetchElectionsPreview() {
  const res = await apiClient.get<any>("/elections", {
    params: { page: 0, size: 5, sort: ["dateCreated,desc"] },
  });
  return res.data?.content ?? [];
}

export default function SystemDashboard() {
  const orgCountQ = useQuery({
    queryKey: ["sys", "orgCount"],
    queryFn: fetchOrgCount,
  });
  const electionsCountQ = useQuery({
    queryKey: ["sys", "electionsCount"],
    queryFn: fetchElectionsCount,
  });
  const electionsPreviewQ = useQuery({
    queryKey: ["sys", "electionsPreview"],
    queryFn: fetchElectionsPreview,
  });

  const orgCount = orgCountQ.data ?? 0;
  const electionsCount = electionsCountQ.data ?? 0;
  const electionsRows = (electionsPreviewQ.data ?? []).map((e: any) => [
    <div className="font-semibold text-slate-900">{e.electionName ?? "—"}</div>,
    <span className="text-slate-700">{e.year ?? "—"}</span>,
    <Chip
      text={String(e.isActive ? "ACTIVE" : "INACTIVE")}
      tone={e.isActive ? "green" : "slate"}
    />,
  ]);

  return (
    <DashboardFrame
      title="System Admin Dashboard"
      subtitle="Platform-wide observability across tenants, elections, and operations."
      right={<Chip text="SYSTEM" tone="blue" />}
    >
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
          title="Tenant / Platform Notes"
          subtitle="Real-world: system dashboard is observability + administration"
        >
          <div className="space-y-2 text-sm text-slate-700">
            <div>• Tenants can be active even when no election is active.</div>
            <div>
              • System admin monitors integrity signals (failures, retries,
              suspicious auth).
            </div>
            <div>
              • This page is ready to plug in audit/notification views when you
              expose them.
            </div>
          </div>
        </Panel>
      </Grid>
    </DashboardFrame>
  );
}
