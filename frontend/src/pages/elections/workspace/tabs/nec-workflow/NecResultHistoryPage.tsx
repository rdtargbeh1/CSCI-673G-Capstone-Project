

/**
 * NEC WORKFLOW • HISTORY
 *
 * Source:
 * - nec_result_history
 *
 * Purpose:
 * - Audit trail of publish/unpublish snapshots
 * - Rollback / forensic trace
 */

import { useMemo } from "react";
import { Panel, SimpleTable, PlaceholderNote } from "../../../shared/elections-ui";

export default function NecResultHistoryPage() {
  const rows = useMemo(
    () => [
      ["v1", "2029-10-01 6:12 PM", "Published", "nec_result_history"],
      ["v0", "2029-10-01 5:40 PM", "Draft snapshot", "nec_result_history"],
    ],
    []
  );

  return (
    <Panel title="History">
      <SimpleTable
        columns={["Version", "Time", "Action", "Source"]}
        rows={rows}
      />

      <div className="mt-3">
        <PlaceholderNote
          title="Audit & traceability"
          bullets={[
            "Each publish/unpublish should write a new history record.",
            "History enables rollback and forensic analysis.",
            "Publishing should log audit_ledger and audit_log events (optional but recommended).",
          ]}
        />
      </div>
    </Panel>
  );
}
