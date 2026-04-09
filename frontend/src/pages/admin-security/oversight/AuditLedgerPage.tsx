/**
 * OVERSIGHT: AUDIT LEDGER
 * TABLES: audit_ledger, audit_ledger_retry
 * PURPOSE:
 * - Tamper-resistant ledger for sensitive actions (cryptographic).
 * - NEC/SYSTEM only view.
 */

import { useAuth } from "../../../auth/useAuth";
import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

export default function AuditLedgerPage() {
  const { dashboardMode } = useAuth();
  const allowed = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const rows = [
    ["OK", "PUBLISH_RESULTS", "nec_admin", "Hash: abc...123", "audit_ledger"],
    [
      "RETRY",
      "LEDGER_WRITE",
      "system",
      "Reason: transient failure",
      "audit_ledger_retry",
    ],
  ];

  return (
    <AdminShell
      title="Oversight • Audit Ledger"
      subtitle="NEC/System only. Tamper-resistant audit ledger."
      right={<Badge>{allowed ? "NEC/SYSTEM" : "Restricted"}</Badge>}
    >
      <Card title="Ledger">
        <Table
          columns={["State", "Action", "Actor", "Proof", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Ledger entries verify integrity of sensitive actions.",
              "Retry queue shows failed ledger writes with recovery controls.",
              "Export ledger evidence for compliance audits.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "audit_ledger stores signed/hash-chained events.",
              "audit_ledger_retry stores retry records for failed writes.",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
