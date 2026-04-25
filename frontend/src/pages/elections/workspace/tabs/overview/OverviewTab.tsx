
// OverviewTab.tsx

import { useMemo } from "react";
import { useAuth } from "../../../../../auth/useAuth";
import { useElectionOverview } from "../../../../../shared/hooks/useElectionOverview";
import {
  Panel,
  // PlaceholderNote,
  ReadOnlyBanner,
  SimpleTable,
} from "../../../shared/elections-ui";

export default function OverviewTab() {
  const { dashboardMode } = useAuth();
  const isNecOrSystem = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const { data, isLoading, error } = useElectionOverview();

  /* -------------------------------
     Readiness
  -------------------------------- */
  const readinessRows = useMemo(() => {
    if (!data) return [];

    const r = data.readiness;

    const contestsStatus =
      r.activeContests === 0
        ? "❌"
        : r.contestsMissingOptions === 0
        ? "✅"
        : "⚠️";

    const stagingStatus =
      r.stagingImported === 0 ? "⚠️" : r.stagingUnvalidated > 0 ? "⚠️" : "✅";

    return [
      [
        "Election parties qualified",
        r.qualifiedParties > 0 ? "✅" : "❌",
        "election_party",
      ],
      [
        "Candidates assigned",
        r.candidatesAssigned > 0 ? "✅" : "❌",
        "election_candidate",
      ],
      ["Contests & options ready", contestsStatus, "contest, contest_option"],
      [
        "Center allocation",
        r.centerAllocations > 0 ? "✅" : "❌",
        "polling_center_allocation",
      ],
      [
        "Place allocation",
        r.placeAllocations > 0 ? "✅" : "❌",
        "polling_place_allocation",
      ],
      [
        "Submissions enabled",
        r.submissionsEnabled ? "✅" : "❌",
        "org_setting",
      ],
      ["Official staging imported", stagingStatus, "nec_result_staging"],
      [
        "Official published",
        r.officialPublished > 0 ? "✅" : "❌",
        "nec_result_public",
      ],
    ];
  }, [data]);

  /* -------------------------------
     Org Queues (REAL DB DATA)
  -------------------------------- */
  const orgQueues = useMemo(() => {
    if (!data) return [];

    const by = data.orgQueues.byStatus ?? {};

    return [
      ["Pending verification", by.PENDING ?? 0, "vote_submission"],
      ["Verified submissions", by.VERIFIED ?? 0, "vote_submission"],
      ["Flagged submissions", by.FLAGGED ?? 0, "vote_submission"],
      ["Rejected submissions", by.REJECTED ?? 0, "vote_submission"],
      [
        "Missing tally sheet",
        data.orgQueues.missingTallySheets ?? 0,
        "tally_sheet",
      ],
    ];
  }, [data]);

  /* -------------------------------
     Integrity
  -------------------------------- */
  const integritySummary = useMemo(() => {
    if (!data) return [];
    return [
      [
        "Open discrepancies",
        data.integrity.openDiscrepancies ?? 0,
        "discrepancy",
      ],
      ["Anomalies", data.integrity.anomaliesTotal ?? 0, "anomaly_event"],
    ];
  }, [data]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!isNecOrSystem && (
        <ReadOnlyBanner
          reason="Official election configuration is managed by NEC/System Admin."
          sources={[
            "election",
            "election_party",
            "election_candidate",
            "contest",
            "contest_option",
          ]}
        />
      )}

      {isLoading && <div>Loading overview…</div>}
      {error && (
        <div style={{ color: "crimson" }}>Failed to load overview.</div>
      )}

      <Panel title="Election Readiness Checklist">
        <SimpleTable
          columns={["Step", "Status", "Source"]}
          rows={readinessRows}
        />
      </Panel>

      <Panel title="Organization Operational Queues">
        <SimpleTable columns={["Queue", "Count", "Source"]} rows={orgQueues} />
      </Panel>

      <Panel title="Integrity Summary">
        <SimpleTable
          columns={["Indicator", "Count", "Source"]}
          rows={integritySummary}
        />
      </Panel>
    </div>
  );
}
