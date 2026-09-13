/**
 * REGISTRY: PRIVATE VOTER REGISTRY
 * TABLE: voter_registration (private)
 * PURPOSE:
 * - NEC/System only private registry for administrative operations.
 */

import { Badge, Card, Note, PageShell, Table } from "../shared/geo-ui";

export default function VoterRegistryPage() {
  const rows = [
    [
      "VTR-00012911",
      "John Doe",
      "Montserrado",
      "PC-021",
      "Active",
      "voter_registration",
    ],
    [
      "VTR-00012912",
      "Mary Smith",
      "Bong",
      "PC-019",
      "Active",
      "voter_registration",
    ],
  ];

  return (
    <PageShell
      title="Registry • Voter Registration (Private)"
      subtitle="NEC/System only. Private registry. Supports secure lookup and administrative actions."
      right={<Badge>Private</Badge>}
    >
      <Card title="Voter Registry">
        <Table
          columns={["Voter ID", "Name", "County", "Center", "Status", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Secure lookup by voter id (and other allowed fields).",
              "RLS policies enforced. Audit ledger entries for sensitive access.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "voter_registration is private.",
              "Access should be audited: audit_ledger/audit_log.",
            ]}
          />
        </div>
      </Card>
    </PageShell>
  );
}
