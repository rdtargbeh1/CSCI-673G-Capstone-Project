/**
 * OVERSIGHT: FILE UPLOADS
 * TABLE: file_upload
 * PURPOSE:
 * - Admin view of all uploads:
 *   - tally sheets
 *   - voter imports
 *   - report outputs (if shared storage)
 */

import { AdminShell, Badge, Card, Note, Table } from "../shared/admin-ui";

export default function FileUploadsPage() {
  const rows = [
    ["tally_sheet", "PC-021", "tally_021.jpg", "2.1 MB", "file_upload"],
    [
      "import_batch",
      "BATCH-2029-10-02",
      "voters_oct02.xlsx",
      "18.4 MB",
      "file_upload",
    ],
    [
      "report_file",
      "County Summary",
      "results_county.csv",
      "2.3 MB",
      "file_upload",
    ],
  ];

  return (
    <AdminShell
      title="Oversight • File Uploads"
      subtitle="System-wide upload inventory and traceability."
      right={<Badge>Storage</Badge>}
    >
      <Card title="Uploads">
        <Table
          columns={["Category", "Linked To", "File", "Size", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Open/download uses presigned URLs (S3).",
              "Retention policies and access logging.",
              "Link back to source entity (submission, batch, report).",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "file_upload stores upload metadata and linkage to entities.",
            ]}
          />
        </div>
      </Card>
    </AdminShell>
  );
}
