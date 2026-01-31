

/**
 * WORKSPACE: NEC RESULT
 *
 * WHO SEES THIS:
 * - NEC and SYSTEM admins only
 *
 * PURPOSE:
 * - Review / manage NEC official result entity (NECResult)
 * - This is NOT staging — this is the “official object” layer:
 *   - view current published status
 *   - view summary totals
 *   - quick actions (later): publish/unpublish, refresh geo MV, open geo table
 *
 * DATA SOURCES (backend already implemented):
 * - nec_result (or nec_result_public)
 * - v_nec_result_geo / mv_nec_result_geo (optional drilldown)
 *
 * UI GOAL:
 * - A clean operational dashboard for NEC admins
 * - Avoid too many headings: keep it compact, actionable
 */

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { RefreshCw, CheckCircle2, XCircle } from "lucide-react";

import {
  Panel,
  SimpleTable,
  PlaceholderNote,
  Badge,
} from "../../../shared/elections-ui";

type NecResultSummary = {
  electionId: string;
  contestId: string;

  isPublished: boolean;
  publishedAt?: string;

  rowsInPublic?: number;
  totalRegisteredVoters?: number;
  ballotsCast?: number;

  invalidBallots?: number;
  unmarkedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
  unusedBallots?: number;
};

export default function NecResultTab() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  /**
   * ✅ PLACEHOLDER
   * Later API ideas (example names only):
   * - GET /api/nec-results/summary?electionId=...&contestId=...
   * - GET /api/nec-results/public?electionId=...&contestId=... (paged table)
   */
  const summary: NecResultSummary = useMemo(
    () => ({
      electionId: electionId ?? "—",
      contestId: contestId ?? "—",

      isPublished: true,
      publishedAt: "2026-01-30 10:42 AM",

      rowsInPublic: 742,
      totalRegisteredVoters: 1_420_000,
      ballotsCast: 1_010_220,

      invalidBallots: 8_120,
      unmarkedBallots: 3_040,
      rejectedBallots: 1_230,
      spoiledBallots: 620,
      unusedBallots: 9_900,
    }),
    [electionId, contestId]
  );

  const statusPill = summary.isPublished ? (
    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-800">
      <CheckCircle2 size={14} /> PUBLISHED
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-extrabold text-rose-800">
      <XCircle size={14} /> NOT PUBLISHED
    </span>
  );

  const metricRows = [
    ["Rows (public)", (summary.rowsInPublic ?? 0).toLocaleString()],
    ["Registered voters", (summary.totalRegisteredVoters ?? 0).toLocaleString()],
    ["Ballots cast", (summary.ballotsCast ?? 0).toLocaleString()],
  ];

  const invalidRows = [
    ["Invalid", (summary.invalidBallots ?? 0).toLocaleString()],
    ["Unmarked", (summary.unmarkedBallots ?? 0).toLocaleString()],
    ["Rejected", (summary.rejectedBallots ?? 0).toLocaleString()],
    ["Spoiled", (summary.spoiledBallots ?? 0).toLocaleString()],
    ["Unused", (summary.unusedBallots ?? 0).toLocaleString()],
  ];

  const onRefresh = async () => {
    // later:
    // - refetch summary
    // - refetch public list
    // - optionally refresh mv_nec_result_geo
  };

  const onPublishToggle = async () => {
    // later:
    // - publish/unpublish
    // - refresh MV
    // - invalidate tenants “Official Published” query
  };

  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="NEC Result"
        right={
          <div className="flex flex-wrap items-center gap-2">
            {statusPill}
            <Badge text="NEC Only" />

            <button
              type="button"
              onClick={onPublishToggle}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
            >
              {summary.isPublished ? "Unpublish" : "Publish"}
            </button>

            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      >
        <div className="text-xs text-slate-600">
          Election: <b>{summary.electionId}</b> • Contest:{" "}
          <b>{summary.contestId}</b>
          {summary.publishedAt ? (
            <>
              {" "}
              • Published at: <b>{summary.publishedAt}</b>
            </>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-xs font-extrabold text-slate-700">
              Totals
            </div>
            <SimpleTable columns={["Metric", "Value"]} rows={metricRows} />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="mb-2 text-xs font-extrabold text-slate-700">
              Invalid / Outside Box
            </div>
            <SimpleTable columns={["Type", "Value"]} rows={invalidRows} />
          </div>
        </div>

        <div className="mt-4">
          <PlaceholderNote
            title="Next backend wiring (already implemented)"
            bullets={[
              "Fetch summary from NECResult backend endpoint (contest-aware).",
              "Publish/unpublish should flip isPublished and record history.",
              "On publish: refresh mv_nec_result_geo and invalidate tenant officialPublished query.",
              "Add a 'View Geo' button later to open the NecResultGeo page under Official tab.",
            ]}
          />
        </div>
      </Panel>
    </div>
  );
}
