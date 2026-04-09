/**
 * OVERSIGHT: AUDIT LOGS
 * TABLE: audit_log
 * PURPOSE:
 * - Human-readable event log for operations and admin actions.
 */

import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

export default function AuditLogsPage() {
  const rows = [
    ["AUTH", "LOGIN_SUCCESS", "ronald", "Tenant: Unity Party", "audit_log"],
    ["SUBMISSION", "VERIFIED", "supervisor1", "PC-021", "audit_log"],
    ["NEC", "PUBLISH_RESULTS", "nec_admin", "Election 2029", "audit_log"],
  ];

  return (
    <AdminShell
      title="Oversight • Audit Logs"
      subtitle="Operational and administrative audit events."
      right={<Badge>Audit</Badge>}
    >
      <Card title="Audit Logs">
        <Table
          columns={["Area", "Event", "Actor", "Context", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Search by actor, election, org, entity id, time range.",
              "Filters for Auth / Submissions / NEC workflows / Admin changes.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={["audit_log stores the readable audit trail."]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
