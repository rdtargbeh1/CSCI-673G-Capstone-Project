/**
 * SECURITY: SIGNING KEYS
 * TABLE: user_signing_key
 * PURPOSE:
 * - Cryptographic signing/verification keys for sensitive operations.
 */

import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

export default function SigningKeysPage() {
  const rows = [
    ["ronald", "Active", "Created: 2025-12-01", "user_signing_key"],
    ["jane.d", "Revoked", "Revoked: 2025-12-05", "user_signing_key"],
  ];

  return (
    <AdminShell
      title="Security • Signing Keys"
      subtitle="Key lifecycle management for signed actions."
      right={<Badge>Crypto</Badge>}
    >
      <Card title="Keys">
        <Table columns={["User", "Status", "Notes", "Source"]} rows={rows} />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Key rotation and revocation workflow.",
              "Signed actions recorded into audit_ledger (tamper-resistant).",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "user_signing_key stores user-bound signing keys and state.",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
