/**
 * WORKSPACE: RESULTS
 *
 * PURPOSE:
 * - Unified results area with mode toggle:
 *   - Party (ORG submissions aggregation) = v_*_party views
 *   - Official (NEC published)            = v_*_official views
 *   - Compare (party vs official deltas)  = v_candidate_county_compare (and other compare lenses)
 *
 * DATA SOURCES (SQL VIEWS):
 * - v_center_stats_party, v_district_stats_party, v_county_stats_party, v_election_stats_party
 * - v_center_stats_official, v_district_stats_official, v_county_stats_official, v_election_stats_official
 * - v_candidate_*_party, v_candidate_*_official
 * - v_candidate_county_compare
 * - public.v_nec_result_geo / public.mv_nec_result_geo (geo reporting)
 *
 * PERMISSIONS:
 * - Party mode: always for tenant (ORG)
 * - Official mode: visible to tenants only when published/public
 * - Compare mode: depends on official publish + role policy
 */

import { useState } from "react";
import { useAuth } from "../../../../../auth/useAuth";
import {
  Panel,
  Badge,
  SimpleTable,
  PlaceholderNote,
} from "../../../shared/elections-ui";
import { TrustSourceTag } from "../../../../dashboard/shared/dashboard-ui";

type Mode = "PARTY" | "OFFICIAL" | "COMPARE";

export default function ResultsTab() {
  const { dashboardMode } = useAuth();
  const [mode, setMode] = useState<Mode>("PARTY");

  // Placeholder: official published flag (later from NEC publish state)
  const officialPublished =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" ? false : true;

  const partyRows = [
    ["County", "Candidate A", 12340, "v_candidate_county_stats_party"],
    ["County", "Candidate B", 8210, "v_candidate_county_stats_party"],
  ];

  const officialRows = [
    ["County", "Candidate A", 12010, "v_candidate_county_stats_official"],
    ["County", "Candidate B", 8420, "v_candidate_county_stats_official"],
  ];

  const compareRows = [
    [
      "County",
      "Candidate A",
      12340,
      12010,
      "+330",
      "v_candidate_county_compare",
    ],
    ["County", "Candidate B", 8210, 8420, "-210", "v_candidate_county_compare"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Results (Party / Official / Compare)"
        right={
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setMode("PARTY")}
              style={btn(mode === "PARTY")}
            >
              Party
            </button>
            <button
              type="button"
              onClick={() => setMode("OFFICIAL")}
              style={btn(mode === "OFFICIAL")}
              disabled={!officialPublished}
              title={
                !officialPublished
                  ? "Official results not published yet"
                  : "Official results"
              }
            >
              Official
            </button>
            <button
              type="button"
              onClick={() => setMode("COMPARE")}
              style={btn(mode === "COMPARE")}
              disabled={!officialPublished}
              title={
                !officialPublished
                  ? "Compare requires published official results"
                  : "Compare mode"
              }
            >
              Compare
            </button>

            <Badge
              text={
                officialPublished
                  ? "Official: Available"
                  : "Official: Not Published"
              }
            />
          </div>
        }
      >
        {mode === "PARTY" && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <TrustSourceTag source="ORG" />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Aggregated from tenant submissions views (v_*_party).
              </span>
            </div>
            <SimpleTable
              columns={["Level", "Candidate/Option", "Votes", "Source"]}
              rows={partyRows as any}
            />
          </>
        )}

        {mode === "OFFICIAL" && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <TrustSourceTag source="OFFICIAL_PUBLISHED" />
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Aggregated from NEC published views (v_*_official).
              </span>
            </div>
            <SimpleTable
              columns={["Level", "Candidate/Option", "Votes", "Source"]}
              rows={officialRows as any}
            />
          </>
        )}

        {mode === "COMPARE" && (
          <>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <span style={{ fontSize: 12, opacity: 0.7 }}>
                Compare uses official vs party deltas to generate discrepancy
                workflows.
              </span>
            </div>
            <SimpleTable
              columns={[
                "Level",
                "Candidate/Option",
                "Party Votes",
                "Official Votes",
                "Delta",
                "Source",
              ]}
              rows={compareRows as any}
            />
          </>
        )}

        <div style={{ marginTop: 12 }}>
          <PlaceholderNote
            title="Later behavior"
            bullets={[
              "Add geographic drilldown bar: Election → County → District → Center → Place.",
              "Export buttons tie to report_snapshot/report_file.",
              "Compare mode enables Create Discrepancy action (writes discrepancy).",
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}

function btn(active: boolean) {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: active ? "#f3f4f6" : "#fff",
    fontWeight: 700,
    cursor: "pointer",
    opacity: 1,
  } as const;
}
