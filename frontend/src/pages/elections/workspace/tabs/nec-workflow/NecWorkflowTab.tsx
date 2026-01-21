/**
 * WORKSPACE: NEC WORKFLOW
 *
 * WHO SEES THIS:
 * - NEC and SYSTEM admins only
 *
 * PURPOSE:
 * - Official data pipeline:
 *   - nec_result_staging (imports)
 *   - validation errors
 *   - publish to nec_result_public and record nec_result_history
 *   - geo outputs: public.v_nec_result_geo + public.mv_nec_result_geo
 *
 * DATA SOURCES (SQL):
 * - nec_result_staging
 * - nec_result_public
 * - nec_result_history
 * - public.v_nec_result_geo
 * - public.mv_nec_result_geo
 * - mv_refresh_log (optional monitoring)
 */

import { useState } from "react";
import {
  Panel,
  SimpleTable,
  PlaceholderNote,
  Badge,
} from "../../../shared/elections-ui";

type SubTab = "STAGING" | "PUBLISHED" | "HISTORY" | "GEO";

export default function NecWorkflowTab() {
  const [tab, setTab] = useState<SubTab>("STAGING");

  const stagingRows = [
    ["IMPORT-2029-10-01-01", "PENDING", 120, 3, "nec_result_staging"],
    ["IMPORT-2029-10-01-02", "VALIDATED", 240, 0, "nec_result_staging"],
  ];

  const publishedRows = [
    [
      "Published Batch",
      "2029-10-01 6:12 PM",
      "Public=false",
      "nec_result_public",
    ],
  ];

  const historyRows = [
    ["v1", "2029-10-01 6:12 PM", "Published", "nec_result_history"],
    ["v0", "2029-10-01 5:40 PM", "Draft snapshot", "nec_result_history"],
  ];

  const geoRows = [
    ["County", "Reporting %", "Total Votes", "public.v_nec_result_geo"],
    ["Montserrado", "61%", "520,100", "public.v_nec_result_geo"],
    ["Bong", "44%", "130,220", "public.v_nec_result_geo"],
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="NEC Workflow"
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
              onClick={() => setTab("STAGING")}
              style={btn(tab === "STAGING")}
            >
              Staging
            </button>
            <button
              type="button"
              onClick={() => setTab("PUBLISHED")}
              style={btn(tab === "PUBLISHED")}
            >
              Published
            </button>
            <button
              type="button"
              onClick={() => setTab("HISTORY")}
              style={btn(tab === "HISTORY")}
            >
              History
            </button>
            <button
              type="button"
              onClick={() => setTab("GEO")}
              style={btn(tab === "GEO")}
            >
              Geo
            </button>
            <Badge text="NEC Only" />
          </div>
        }
      >
        {tab === "STAGING" && (
          <>
            <SimpleTable
              columns={["Batch", "Status", "Rows", "Errors", "Source"]}
              rows={stagingRows}
            />
            <div style={{ marginTop: 12 }}>
              <PlaceholderNote
                title="Later actions"
                bullets={[
                  "Import staging (CSV/Excel) → writes nec_result_staging.",
                  "Validate: store errors and block publish until resolved.",
                  "Publish: writes nec_result_public, appends nec_result_history, refreshes mv if needed.",
                ]}
              />
            </div>
          </>
        )}

        {tab === "PUBLISHED" && (
          <>
            <SimpleTable
              columns={["Item", "Time", "Visibility", "Source"]}
              rows={publishedRows}
            />
            <div style={{ marginTop: 12 }}>
              <PlaceholderNote
                title="Visibility rule"
                bullets={[
                  "When public=true, tenants can view Official results and Compare mode.",
                  "When public=false, only NEC/SYSTEM can view official data.",
                ]}
              />
            </div>
          </>
        )}

        {tab === "HISTORY" && (
          <>
            <SimpleTable
              columns={["Version", "Time", "Action", "Source"]}
              rows={historyRows}
            />
            <div style={{ marginTop: 12 }}>
              <PlaceholderNote
                title="Audit & traceability"
                bullets={[
                  "History enables rollback and forensic analysis.",
                  "Publishing should log audit_ledger entries and audit_log events.",
                ]}
              />
            </div>
          </>
        )}

        {tab === "GEO" && (
          <>
            <SimpleTable
              columns={["Level", "Reporting %", "Total Votes", "Source"]}
              rows={geoRows as any}
            />
            <div style={{ marginTop: 12 }}>
              <PlaceholderNote
                title="Geo view later"
                bullets={[
                  "This will become a map later; for now it’s a drilldown table.",
                  "Backed by public.v_nec_result_geo and/or public.mv_nec_result_geo.",
                ]}
              />
            </div>
          </>
        )}
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
  } as const;
}
