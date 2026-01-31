

// // src/pages/workspace/results/CandidateCountyCompare.tsx

// /**
//  * WORKSPACE: RESULTS • COMPARE • Candidate County Compare
//  *
//  * PURPOSE:
//  * - Compare Party vs Official results to generate deltas/discrepancy workflows.
//  * - Backed by: v_candidate_county_compare (and other compare lenses).
//  *
//  * NOTES:
//  * - Template only (no API wiring yet).
//  * - Requires official results published.
//  */

// import { useMemo, useState } from "react";
// import { useAuth } from "../../../../../auth/useAuth";
// import { Panel, Badge, SimpleTable, PlaceholderNote } from "../../../shared/elections-ui";

// export default function CandidateCountyCompare() {
//   const { dashboardMode } = useAuth();

//   // Placeholder: later pull from NEC publish state
//   const officialPublished =
//     dashboardMode === "NEC" || dashboardMode === "SYSTEM" ? false : true;

//   const [county, setCounty] = useState<string>("All Counties");

//   const rows = useMemo(
//     () => [
//       ["Bong", "Candidate A", 12340, 12010, "+330", "v_candidate_county_compare"],
//       ["Bong", "Candidate B", 8210, 8420, "-210", "v_candidate_county_compare"],
//     ],
//     []
//   );

//   if (!officialPublished) {
//     return (
//       <Panel title="Compare Results • Candidate County Compare" right={<Badge text="Requires Publish" />}>
//         <PlaceholderNote
//           title="Compare is unavailable"
//           bullets={[
//             "Compare mode requires official results to be published.",
//             "Once official results are published, this page will show deltas (Party vs Official).",
//           ]}
//         />
//       </Panel>
//     );
//   }

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//       <Panel
//         title="Compare Results • Candidate County Compare"
//         right={
//           <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
//             <Badge text={county} />
//           </div>
//         }
//       >
//         {/* Controls (template) */}
//         <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
//           <input
//             value={county}
//             onChange={(e) => setCounty(e.target.value)}
//             placeholder="County filter (later: dropdown)"
//             style={input()}
//           />
//           <button type="button" style={btn(false)}>
//             Refresh
//           </button>
//         </div>

//         <SimpleTable
//           columns={[
//             "County",
//             "Candidate/Option",
//             "Party Votes",
//             "Official Votes",
//             "Delta",
//             "Source",
//           ]}
//           rows={rows as any}
//         />

//         <div style={{ marginTop: 12 }}>
//           <PlaceholderNote
//             title="Next wiring"
//             bullets={[
//               "Add drilldown + filters: electionId, contestId, candidateId.",
//               "Enable Create Discrepancy action (writes discrepancy record).",
//               "Add export/snapshot behavior.",
//             ]}
//           />
//         </div>
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
//     fontWeight: 700,
//     cursor: "pointer",
//     opacity: 1,
//   } as const;
// }

// function input() {
//   return {
//     padding: "8px 10px",
//     borderRadius: 10,
//     border: "1px solid #e5e7eb",
//     background: "#fff",
//     fontWeight: 600,
//     minWidth: 220,
//   } as const;
// }
