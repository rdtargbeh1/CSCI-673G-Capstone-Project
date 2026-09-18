/**
 * REGISTRY: PUBLIC ROLL
 * TABLE/VIEW: voter_registration_public
 * PURPOSE:
 * - Public subset of voter registry, visible to permitted tenants/users.
 */

import { Badge, Card, Note, PageShell, Table } from "../shared/geo-ui";

export default function PublicRollPage() {
  const rows = [
    [
      "VTR-00012911",
      "John D.",
      "Montserrado",
      "PC-021",
      "voter_registration_public",
    ],
    ["VTR-00012912", "Mary S.", "Bong", "PC-019", "voter_registration_public"],
  ];

  return (
    <PageShell
      title="Registry • Voter Public Roll"
      subtitle="Public/limited fields view. Tenants may access read-only depending on policy."
      right={<Badge>Public</Badge>}
    >
      <Card title="Public Roll">
        <Table
          columns={["Voter ID", "Name (masked)", "County", "Center", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Public roll shows only allowed fields (masked).",
              "Search is rate-limited and audited depending on policy.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "voter_registration_public is the public-safe view/table.",
              "Must never expose private-only fields.",
            ]}
          />
        </div>
      </Card>
    </PageShell>
  );
}
