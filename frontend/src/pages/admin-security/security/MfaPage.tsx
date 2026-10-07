/**
 * SECURITY: MFA
 * TABLE: user_mfa
 */

import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

export default function MfaPage() {
  const rows = [
    ["ronald", "TOTP", "Enabled", "user_mfa"],
    ["jane.d", "TOTP", "Disabled", "user_mfa"],
  ];

  return (
    <AdminShell
      title="Security • MFA"
      subtitle="Multi-factor authentication status and enforcement."
      right={<Badge>MFA</Badge>}
    >
      <Card title="MFA Status">
        <Table columns={["User", "Method", "Status", "Source"]} rows={rows} />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Admins can require MFA for sensitive roles (NEC/SYSTEM).",
              "User self-service enrollment flow, with backup codes later.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={["user_mfa stores MFA enrollment and metadata."]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
