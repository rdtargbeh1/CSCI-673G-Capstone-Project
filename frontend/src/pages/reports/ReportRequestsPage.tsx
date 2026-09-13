/**
 * REPORTS: REQUESTS / QUEUE
 *
 * TABLE: report_snapshot
 *
 * PURPOSE:
 * - A unified report request system that supports:
 *   - "Export CSV" from Results, Submissions, Integrity
 *   - Scheduled jobs later
 * - Robust for large datasets: async generation
 *
 * EXPECTED FIELDS (typical):
 * - snapshot_id, org_id, election_id (nullable depending report)
 * - report_type (ENUM/string), params (JSON), status
 * - requested_by, requested_at, completed_at
 *
 * WORKFLOW:
 * - Create snapshot -> status=QUEUED
 * - Worker generates file -> create report_file -> status=COMPLETED
 * - Failures -> status=FAILED with error details
 */

import { useAuth } from "../../auth/useAuth";
import { Badge, Card, Note, ReportsShell, Table } from "./shared/reports-ui";

export default function ReportRequestsPage() {
  const { dashboardMode, tenant } = useAuth();

  const rows = [
    [
      "QUEUED",
      "Election Results • County Summary",
      "Presidential General 2029",
      tenant?.orgName ?? "Tenant Org",
      "Requested 2m ago",
      "report_snapshot",
      actionCell("Cancel (later)"),
    ],
    [
      "PROCESSING",
      "Submissions • Pending Verification",
      "Presidential General 2029",
      tenant?.orgName ?? "Tenant Org",
      "Started 1m ago",
      "report_snapshot",
      actionCell("View logs (later)"),
    ],
    [
      "COMPLETED",
      "Integrity • Discrepancy List",
      "Presidential General 2029",
      "NEC",
      "Completed 10m ago",
      "report_snapshot",
      actionCell("Open file"),
    ],
    [
      "FAILED",
      "Voter Public Roll Export",
      "—",
      dashboardMode === "NEC" ? "NEC" : tenant?.orgName ?? "Tenant Org",
      "Failed 1h ago",
      "report_snapshot",
      actionCell("Retry (later)"),
    ],
  ];

  return (
    <ReportsShell
      title="Reports • Requests / Queue"
      subtitle="Async report generation backed by report_snapshot. Exports from Results/Operations create requests here."
      right={
        <div className="flex items-center gap-2">
          <Badge>{dashboardMode}</Badge>
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            + New Request (later)
          </button>
        </div>
      }
    >
      <Card title="Queue">
        <Table
          columns={[
            "Status",
            "Report",
            "Election",
            "Owner",
            "Timing",
            "Source",
            "Action",
          ]}
          rows={rows}
        />

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Create request from any page: Results/Compare/Integrity/Submissions.",
              "Params stored in report_snapshot.params (JSON).",
              "Workers generate in background, then write report_file.",
              "Large exports remain responsive (no UI freezing).",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "report_snapshot = request + parameters + status lifecycle.",
              "report_file = generated file metadata (filename, size, storage key, url).",
              "file_upload/S3 integration can be shared with other exports.",
            ]}
          />
        </div>
      </Card>
    </ReportsShell>
  );
}

function actionCell(label: string) {
  return (
    <button className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs font-bold hover:bg-slate-50">
      {label}
    </button>
  );
}
