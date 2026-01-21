/**
 * SECURITY: SESSIONS
 * TABLE: user_session
 */

import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

export default function SessionsPage() {
  const rows = [
    ["ronald", "Active", "IP: 10.x.x.x", "Device: Chrome", "user_session"],
    ["jane.d", "Expired", "IP: 10.x.x.x", "Device: Edge", "user_session"],
  ];

  return (
    <AdminShell
      title="Security • Sessions"
      subtitle="Monitor and revoke sessions (admin scope)."
      right={<Badge>Sessions</Badge>}
    >
      <Card title="Sessions">
        <Table
          columns={["User", "State", "IP", "Device", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Admins can revoke sessions, force logout, detect suspicious activity.",
              "Session changes recorded into audit_log.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={["user_session stores login sessions and metadata."]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
