/**
 * REGISTRY: IMPORT BATCHES
 * TABLE: import_batch
 * PURPOSE:
 * - Track voter registry imports and processing state.
 */

import { Badge, Card, Note, PageShell, Table } from "../shared/geo-ui";
import { useAuth } from "../../../auth/useAuth";

export default function ImportBatchesPage() {
  const { dashboardMode } = useAuth();
  const allowed = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const rows = [
    ["BATCH-2029-10-01", "COMPLETED", "120,000", "0", "import_batch"],
    ["BATCH-2029-10-02", "PROCESSING", "80,000", "231", "import_batch"],
  ];

  return (
    <PageShell
      title="Registry • Import Batches"
      subtitle="NEC/System only. Track bulk registry imports, errors, and pipeline progress."
      right={<Badge>{allowed ? "NEC/SYSTEM" : "Restricted"}</Badge>}
    >
      <Card
        title="Import Batches"
        right={
          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50">
            + New Import (later)
          </button>
        }
      >
        <Table
          columns={["Batch", "Status", "Rows", "Errors", "Source"]}
          rows={rows}
        />
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          <Note
            title="Later behavior"
            bullets={[
              "Upload CSV/Excel → create import_batch + file_upload record.",
              "Process into voter_registration_staging, then approve into voter_registration.",
            ]}
          />
          <Note
            title="Schema mapping"
            bullets={[
              "import_batch tracks pipeline state.",
              "file_upload stores the import file.",
              "staging table holds validation errors before promotion.",
            ]}
          />
        </div>
      </Card>
    </PageShell>
  );
}
