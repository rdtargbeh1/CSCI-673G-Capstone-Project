/**
 * WORKSPACE: INTEGRITY
 *
 * PURPOSE:
 * - Central integrity monitoring for this election:
 *   - discrepancy (official vs party deltas)
 *   - anomaly_event (policy-defined anomalies e.g., votes > allocation)
 *
 * DATA SOURCES (SQL):
 * - discrepancy
 * - anomaly_event
 * - allocations + submissions for anomaly detection (derived)
 */

import {
  Panel,
  SimpleTable,
  PlaceholderNote,
} from "../../../shared/elections-ui";

export default function IntegrityTab() {
  const discrepancyRows = [
    [
      "OPEN",
      "Montserrado",
      "PC-034",
      "Candidate A delta > threshold",
      "discrepancy",
    ],
    ["INVESTIGATING", "Bong", "PC-019", "Turnout mismatch", "discrepancy"],
  ];

  const anomalyRows = [
    [
      "HIGH",
      "Montserrado",
      "PC-034",
      "Votes exceed ballots issued",
      "anomaly_event",
    ],
    ["MEDIUM", "Nimba", "PC-051", "Late reporting center", "anomaly_event"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel title="Discrepancies">
        <SimpleTable
          columns={["Status", "County", "Center", "Reason", "Source"]}
          rows={discrepancyRows}
        />
        <div style={{ marginTop: 12 }}>
          <PlaceholderNote
            title="Later behavior"
            bullets={[
              "Click row opens discrepancy detail drawer and linked compare lens (v_candidate_county_compare).",
              "Resolution workflow: assign → investigate → resolve with audit trail (audit_log / audit_ledger).",
            ]}
          />
        </div>
      </Panel>

      <Panel title="Anomaly Events">
        <SimpleTable
          columns={["Severity", "County", "Center", "Signal", "Source"]}
          rows={anomalyRows}
        />
        <div style={{ marginTop: 12 }}>
          <PlaceholderNote
            title="Later behavior"
            bullets={[
              "Anomalies may be system-generated (rules) or manual flags.",
              "Links to submissions and allocation context for triage.",
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
