


/**
 * WORKSPACE: NEC WORKFLOW (LAYOUT)
 *
 * WHO SEES THIS:
 * - NEC and SYSTEM admins only
 *
 * PURPOSE:
 * - Official pipeline navigation:
 *   - nec_result (publish status)
 *   - staging imports
 *   - history / audit
 *   - geo outputs (v_nec_result_geo / mv_nec_result_geo)
 */

import { NavLink, Outlet } from "react-router-dom";
import { Badge, Panel } from "../../../../shared/elections-ui";

function tabClass(active: boolean) {
  return [
    "relative inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-extrabold transition",
    active
      ? "border-indigo-200 bg-indigo-50 text-indigo-900 ring-1 ring-indigo-100"
      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
  ].join(" ");
}

function ActiveDot({ active }: { active: boolean }) {
  return (
    <span
      className={[
        "h-2.5 w-2.5 rounded-full",
        active ? "bg-indigo-600" : "bg-slate-300",
      ].join(" ")}
    />
  );
}

export default function NecWorkflowTab() {
  return (
    <div className="flex flex-col gap-3">
      <Panel
        title="NEC Workflow"
        right={
          <div className="flex flex-wrap items-center gap-2">
            <NavLink to="nec-result" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>NEC Result</span>
                  {isActive ? (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  ) : null}
                </>
              )}
            </NavLink>

            <NavLink to="staging" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>Staging</span>
                  {isActive ? (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  ) : null}
                </>
              )}
            </NavLink>

            <NavLink to="history" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>History</span>
                  {isActive ? (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  ) : null}
                </>
              )}
            </NavLink>

            <NavLink to="geo" className={({ isActive }) => tabClass(isActive)}>
              {({ isActive }) => (
                <>
                  <ActiveDot active={isActive} />
                  <span>Geo</span>
                  {isActive ? (
                    <span className="absolute -bottom-[2px] left-2 right-2 h-[2px] rounded-full bg-indigo-600" />
                  ) : null}
                </>
              )}
            </NavLink>

            <Badge text="NEC Only" />
          </div>
        }
      >
        <div className="text-xs text-slate-500">
          Official pipeline: staging → validation → publish → history + geo outputs.
        </div>
      </Panel>

      <Outlet />
    </div>
  );
}



// /**
//  * WORKSPACE: NEC WORKFLOW
//  *
//  * WHO SEES THIS:
//  * - NEC and SYSTEM admins only
//  *
//  * PURPOSE:
//  * - Official data pipeline:
//  *   - nec_result (official object / publish status) ✅ NEW sub-tab
//  *   - nec_result_staging (imports)
//  *   - validation errors
//  *   - publish to nec_result_public and record nec_result_history
//  *   - geo outputs: public.v_nec_result_geo + public.mv_nec_result_geo
//  *
//  * DATA SOURCES (SQL):
//  * - nec_result (or nec_result_public summary/publish flag)
//  * - nec_result_staging
//  * - nec_result_public
//  * - nec_result_history
//  * - public.v_nec_result_geo
//  * - public.mv_nec_result_geo
//  * - mv_refresh_log (optional monitoring)
//  */

// import { useMemo, useState } from "react";
// import {
//   Panel,
//   SimpleTable,
//   PlaceholderNote,
//   Badge,
// } from "../../../../shared/elections-ui";

// type SubTab = "NEC_RESULT" | "STAGING" | "PUBLISHED" | "HISTORY" | "GEO";

// type NecResultSummary = {
//   isPublished: boolean;
//   publishedAt?: string;
//   rowsInPublic?: number;

//   registeredVoters?: number;
//   ballotsCast?: number;

//   invalidBallots?: number;
//   unmarkedBallots?: number;
//   rejectedBallots?: number;
//   spoiledBallots?: number;
//   unusedBallots?: number;
// };

// export default function NecWorkflowTab() {
//   // ✅ default tab is NEC_RESULT (before staging)
//   const [tab, setTab] = useState<SubTab>("NEC_RESULT");

//   // ------------------ PLACEHOLDER DATA ------------------
//   const necResultSummary: NecResultSummary = useMemo(
//     () => ({
//       isPublished: false,
//       publishedAt: undefined,
//       rowsInPublic: 0,

//       registeredVoters: 1_420_000,
//       ballotsCast: 0,

//       invalidBallots: 0,
//       unmarkedBallots: 0,
//       rejectedBallots: 0,
//       spoiledBallots: 0,
//       unusedBallots: 0,
//     }),
//     []
//   );

//   const necResultRows = [
//     ["Published", necResultSummary.isPublished ? "YES" : "NO", "nec_result"],
//     [
//       "Published At",
//       necResultSummary.publishedAt ?? "—",
//       "nec_result_history",
//     ],
//     [
//       "Public Rows",
//       (necResultSummary.rowsInPublic ?? 0).toLocaleString(),
//       "nec_result_public",
//     ],
//     [
//       "Registered Voters",
//       (necResultSummary.registeredVoters ?? 0).toLocaleString(),
//       "polling_center_allocation",
//     ],
//     [
//       "Ballots Cast",
//       (necResultSummary.ballotsCast ?? 0).toLocaleString(),
//       "nec_result_public",
//     ],
//   ];

//   const invalidBreakdownRows = [
//     ["Invalid", (necResultSummary.invalidBallots ?? 0).toLocaleString()],
//     ["Unmarked", (necResultSummary.unmarkedBallots ?? 0).toLocaleString()],
//     ["Rejected", (necResultSummary.rejectedBallots ?? 0).toLocaleString()],
//     ["Spoiled", (necResultSummary.spoiledBallots ?? 0).toLocaleString()],
//     ["Unused", (necResultSummary.unusedBallots ?? 0).toLocaleString()],
//   ];

//   const stagingRows = [
//     ["IMPORT-2029-10-01-01", "PENDING", 120, 3, "nec_result_staging"],
//     ["IMPORT-2029-10-01-02", "VALIDATED", 240, 0, "nec_result_staging"],
//   ];

//   const publishedRows = [
//     ["Published Batch", "2029-10-01 6:12 PM", "Public=false", "nec_result_public"],
//   ];

//   const historyRows = [
//     ["v1", "2029-10-01 6:12 PM", "Published", "nec_result_history"],
//     ["v0", "2029-10-01 5:40 PM", "Draft snapshot", "nec_result_history"],
//   ];

//   const geoRows = [
//     ["County", "Reporting %", "Total Votes", "public.v_nec_result_geo"],
//     ["Montserrado", "61%", "520,100", "public.v_nec_result_geo"],
//     ["Bong", "44%", "130,220", "public.v_nec_result_geo"],
//   ];

//   // later: wire these to backend mutations
//   const onPublish = async () => {};
//   const onUnpublish = async () => {};
//   const onRefreshGeo = async () => {};

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//       <Panel
//         title="NEC Workflow"
//         right={
//           <div
//             style={{
//               display: "flex",
//               gap: 8,
//               alignItems: "center",
//               flexWrap: "wrap",
//             }}
//           >
//             {/* ✅ NEC Result FIRST */}
//             <button
//               type="button"
//               onClick={() => setTab("NEC_RESULT")}
//               style={btn(tab === "NEC_RESULT")}
//             >
//               NEC Result
//             </button>

//             <button
//               type="button"
//               onClick={() => setTab("STAGING")}
//               style={btn(tab === "STAGING")}
//             >
//               Staging
//             </button>
//             <button
//               type="button"
//               onClick={() => setTab("PUBLISHED")}
//               style={btn(tab === "PUBLISHED")}
//             >
//               Published
//             </button>
//             <button
//               type="button"
//               onClick={() => setTab("HISTORY")}
//               style={btn(tab === "HISTORY")}
//             >
//               History
//             </button>
//             <button
//               type="button"
//               onClick={() => setTab("GEO")}
//               style={btn(tab === "GEO")}
//             >
//               Geo
//             </button>

//             <Badge text="NEC Only" />
//           </div>
//         }
//       >
//         {/* ✅ NEW TAB: NEC RESULT */}
//         {tab === "NEC_RESULT" && (
//           <>
//             <SimpleTable
//               columns={["Metric", "Value", "Source"]}
//               rows={necResultRows}
//             />

//             <div style={{ marginTop: 12 }}>
//               <SimpleTable
//                 columns={["Ballot Type", "Value"]}
//                 rows={invalidBreakdownRows}
//               />
//             </div>

//             <div style={{ marginTop: 12 }}>
//               <PlaceholderNote
//                 title="Next actions (backend already done)"
//                 bullets={[
//                   "Show current publish status from NECResult (isPublished).",
//                   "Publish/Unpublish should update NECResult + write nec_result_history.",
//                   "Publishing should control tenant access to Official + Compare pages.",
//                   "Optionally refresh mv_nec_result_geo after publish (or show last refresh time).",
//                 ]}
//               />
//             </div>

//             <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
//               <button type="button" style={actionBtn("primary")} onClick={onPublish}>
//                 Publish
//               </button>
//               <button type="button" style={actionBtn("danger")} onClick={onUnpublish}>
//                 Unpublish
//               </button>
//               <button type="button" style={actionBtn("neutral")} onClick={onRefreshGeo}>
//                 Refresh Geo MV
//               </button>
//             </div>
//           </>
//         )}

//         {tab === "STAGING" && (
//           <>
//             <SimpleTable
//               columns={["Batch", "Status", "Rows", "Errors", "Source"]}
//               rows={stagingRows}
//             />
//             <div style={{ marginTop: 12 }}>
//               <PlaceholderNote
//                 title="Later actions"
//                 bullets={[
//                   "Import staging (CSV/Excel) → writes nec_result_staging.",
//                   "Validate: store errors and block publish until resolved.",
//                   "Publish: writes nec_result_public, appends nec_result_history, refreshes mv if needed.",
//                 ]}
//               />
//             </div>
//           </>
//         )}

//         {tab === "PUBLISHED" && (
//           <>
//             <SimpleTable
//               columns={["Item", "Time", "Visibility", "Source"]}
//               rows={publishedRows}
//             />
//             <div style={{ marginTop: 12 }}>
//               <PlaceholderNote
//                 title="Visibility rule"
//                 bullets={[
//                   "When isPublished=true, tenants can view Official results and Compare mode.",
//                   "When isPublished=false, only NEC/SYSTEM can view official data.",
//                 ]}
//               />
//             </div>
//           </>
//         )}

//         {tab === "HISTORY" && (
//           <>
//             <SimpleTable
//               columns={["Version", "Time", "Action", "Source"]}
//               rows={historyRows}
//             />
//             <div style={{ marginTop: 12 }}>
//               <PlaceholderNote
//                 title="Audit & traceability"
//                 bullets={[
//                   "History enables rollback and forensic analysis.",
//                   "Publishing should log audit_ledger entries and audit_log events.",
//                 ]}
//               />
//             </div>
//           </>
//         )}

//         {tab === "GEO" && (
//           <>
//             <SimpleTable
//               columns={["Level", "Reporting %", "Total Votes", "Source"]}
//               rows={geoRows as any}
//             />
//             <div style={{ marginTop: 12 }}>
//               <PlaceholderNote
//                 title="Geo view later"
//                 bullets={[
//                   "This will become a map later; for now it’s a drilldown table.",
//                   "Backed by public.v_nec_result_geo and/or public.mv_nec_result_geo.",
//                 ]}
//               />
//             </div>
//           </>
//         )}
//       </Panel>
//     </div>
//   );
// }

// function btn(active: boolean) {
//   return {
//     padding: "8px 10px",
//     borderRadius: 10,
//     border: "1px solid #e5e7eb",
//     background: active ? "#f3f4f6" : "#fff",
//     fontWeight: 800,
//   } as const;
// }

// function actionBtn(kind: "primary" | "danger" | "neutral") {
//   const base = {
//     padding: "8px 10px",
//     borderRadius: 10,
//     border: "1px solid #e5e7eb",
//     background: "#fff",
//     fontWeight: 800,
//   } as const;

//   if (kind === "primary") return { ...base, borderColor: "#c7d2fe", background: "#eef2ff" } as const;
//   if (kind === "danger") return { ...base, borderColor: "#fecaca", background: "#fff1f2" } as const;
//   return { ...base, background: "#fff" } as const;
// }

