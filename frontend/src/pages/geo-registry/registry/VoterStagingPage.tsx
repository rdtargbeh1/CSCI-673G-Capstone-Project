/**
 * REGISTRY: VOTER STAGING
 * TABLE: voter_registration_staging
 * PURPOSE:
 * - Validate records before promoting to voter_registration.
 */

import { Badge, Card, Note, PageShell, Table } from "../shared/geo-ui";

export default function VoterStagingPage() {
  const rows = [
    [
      "BATCH-2029-10-02",
      "John Doe",
      "VTR-00012911",
      "INVALID DOB",
      "voter_registration_staging",
    ],
    [
      "BATCH-2029-10-02",
      "Mary Smith",
      "VTR-00012912",
      "MISSING CENTER",
      "voter_registration_staging",
    ],
  ];

  return (
    <PageShell
      title="Registry • Voter Staging"
      subtitle="NEC/System only. Fix validation errors before promoting records to private registry."
      right={<Badge>Staging</Badge>}
    >
      <Card title="Staging Records (Errors)">
        <Table
          columns={["Batch", "Name", "Voter ID", "Error", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Inline fix flow or export error rows for correction.",
              "Approve selected records → promote to voter_registration.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "voter_registration_staging holds records + validation status.",
              "Promotion writes into voter_registration (private).",
            ]}
          />
        </div>
      </Card>
    </PageShell>
  );
}
