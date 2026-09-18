

/**
 * NEC WORKFLOW • STAGING
 *
 * Source:
 * - nec_result_staging
 * - validation error tables (later)
 *
 * Later actions:
 * - Import file → staging
 * - Validate → show errors
 * - Fix/resolve errors
 * - Publish → writes nec_result_public + history, refresh MV
 */

import { useMemo } from "react";
import { Panel, SimpleTable, PlaceholderNote } from "../../../shared/elections-ui";



export default function NecResultStagingPage() {
  const rows = useMemo(
    () => [
      ["IMPORT-2029-10-01-01", "PENDING", 120, 3, "nec_result_staging"],
      ["IMPORT-2029-10-01-02", "VALIDATED", 240, 0, "nec_result_staging"],
    ],
    []
  );

  return (
    <Panel title="Staging">
      <SimpleTable
        columns={["Batch", "Status", "Rows", "Errors", "Source"]}
        rows={rows}
      />

      <div className="mt-3">
        <PlaceholderNote
          title="Next actions"
          bullets={[
            "Import staging (CSV/Excel) → writes nec_result_staging.",
            "Validate: store errors and block publish until resolved.",
            "Publish: writes nec_result_public, appends nec_result_history, refreshes mv_nec_result_geo if needed.",
          ]}
        />
      </div>
    </Panel>
  );
}
