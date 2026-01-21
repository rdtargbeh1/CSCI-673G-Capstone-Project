/**
 * OPERATIONS: NOTIFICATIONS
 *
 * PURPOSE:
 * - Actionable operational alerts:
 *   - verification needed
 *   - discrepancy detected
 *   - NEC publish updates (if permitted)
 * - Later supports mark read, filter, and deep-link to entity.
 *
 * DATA SOURCES (SQL):
 * - notification
 * - (optional) audit_log for related events
 */

import { Badge, Card, Note, OpsPageShell, Table } from "./shared/ops-ui";
import { useAuth } from "../../auth/useAuth";

export default function NotificationsPage() {
  const { tenant } = useAuth();

  const rows = [
    [
      "Unread",
      "Submission pending verification (PC-021)",
      "Link to /elections/:id/submissions?queue=pending",
      "notification",
    ],
    [
      "Unread",
      "Flagged submission needs review (PC-034)",
      "Link to /elections/:id/submissions?queue=flagged",
      "notification",
    ],
    [
      "Read",
      "Official results published (Public=true)",
      "Link to /elections/:id/results?mode=official",
      "notification",
    ],
  ];

  return (
    <OpsPageShell
      title="Operations • Notifications"
      subtitle={`Tenant: ${
        tenant?.orgName ?? "—"
      } • Alerts and actionable messages`}
      right={<Badge>Bell sync later</Badge>}
    >
      <Card
        title="Inbox"
        right={
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              Mark all read (later)
            </button>
            <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
              Filters (later)
            </button>
          </div>
        }
      >
        <Table
          columns={["State", "Message", "Target", "Source"]}
          rows={rows.map((r) => [
            <Badge key="st">{String(r[0])}</Badge>,
            r[1] as string,
            <span key="t" className="text-xs text-slate-600">
              {String(r[2])}
            </span>,
            r[3] as string,
          ])}
        />

        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Notifications are tenant-scoped and role-aware.",
              "Each notification deep-links to the correct page and pre-filters queues.",
              "Bell icon in TopBar shows unread count and opens this page/drawer.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "notification stores messages, state (read/unread), and target references.",
              "audit_log may be used to generate or correlate notifications.",
            ]}
          />
        </div>
      </Card>
    </OpsPageShell>
  );
}
