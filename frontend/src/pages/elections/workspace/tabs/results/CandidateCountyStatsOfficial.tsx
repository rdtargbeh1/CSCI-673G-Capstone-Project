
// src/pages/workspace/results/CandidateCountyStatsOfficial.tsx

/**
 * WORKSPACE: RESULTS • OFFICIAL • Candidate County Stats
 *
 * PURPOSE:
 * - Show NEC published candidate vote counts.
 * - Backed by: v_candidate_county_stats_official (and related v_*_official views).
 *
 * NOTES:
 * - Template only (no API wiring yet).
 * - Tenants should see only if official results are published/public.
 */

import { useMemo, useState } from "react";
import { useAuth } from "../../../../../auth/useAuth";
import { Panel, Badge, SimpleTable, PlaceholderNote } from "../../../shared/elections-ui";
import { TrustSourceTag } from "../../../../dashboard/shared/dashboard-ui";

export default function CandidateCountyStatsOfficial() {
  const { dashboardMode } = useAuth();

  // Placeholder: later pull from NEC publish state
  const officialPublished =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" ? false : true;

  const [county, setCounty] = useState<string>("All Counties");

  console.log("OFFICIAL PAGE LOADED");

  const rows = useMemo(
    () => [
      ["Bong", "Candidate A", 12010, "v_candidate_county_stats_official"],
      ["Bong", "Candidate B", 8420, "v_candidate_county_stats_official"],
    ],
    []
  );

  if (!officialPublished) {
    return (
      <Panel title="Official Results • Candidate County Stats" right={<Badge text="Not Published" />}>
        <PlaceholderNote
          title="Official results not available"
          bullets={[
            "NEC has not published official results yet.",
            "Once published, this page becomes visible to tenants (policy).",
          ]}
        />
      </Panel>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Official Results • Candidate County Stats"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Badge text={county} />
          </div>
        }
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
          <TrustSourceTag source="OFFICIAL_PUBLISHED" />
          <span style={{ fontSize: 12, opacity: 0.7 }}>
            Aggregated from NEC published views (v_*_official).
          </span>
        </div>

        {/* Controls (template) */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
          <input
            value={county}
            onChange={(e) => setCounty(e.target.value)}
            placeholder="County filter (later: dropdown)"
            style={input()}
          />
          <button type="button" style={btn(false)}>
            Refresh
          </button>
        </div>

        <SimpleTable
          columns={["County", "Candidate/Option", "Votes", "Source"]}
          rows={rows as any}
        />

        <div style={{ marginTop: 12 }}>
          <PlaceholderNote
            title="Next wiring"
            bullets={[
              "Add publish state from NEC result workflow.",
              "Add Election + Contest selectors.",
              "Add drilldown County → District → Center → Place.",
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

function input() {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: "#fff",
    fontWeight: 600,
    minWidth: 220,
  } as const;
}
