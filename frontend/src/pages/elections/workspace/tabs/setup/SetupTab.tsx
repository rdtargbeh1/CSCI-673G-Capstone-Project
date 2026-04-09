// src/pages/elections/workspace/tabs/setup/SetupTab.tsx

import { useState } from "react";
import { useAuth } from "../../../../../auth/useAuth";
import { Panel, Badge } from "../../../shared/elections-ui";

import type { SetupSubTab } from "./setup.types";

import ElectionPartiesTab from "./election/ElectionPartiesTab";
import ElectionCandidatesTab from "./election/ElectionCandidatesTab";
import ContestsTab from "./election/ContestsTab";
import ContestOptionsPage from "./election/ContestOptionsPage";

// ✅ NEW
import SubmissionNormalizationTab from "./election/SubmissionNormalizationTab";

import PartiesMasterTab from "./masters/PartiesMasterTab";
import CandidatesMasterTab from "./masters/CandidatesMasterTab";

export default function SetupTab() {
  const { dashboardMode } = useAuth();
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const [tab, setTab] = useState<SetupSubTab>("ELECTION_PARTIES");
  const [selectedContestId, setSelectedContestId] = useState<string | null>(
    null
  );

  const openContestOptions = (contestId: string) => {
    setSelectedContestId(contestId);
    setTab("CONTEST_OPTIONS");
  };

  const goBackToContests = () => {
    setTab("CONTESTS");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Setup"
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
              onClick={() => setTab("ELECTION_PARTIES")}
              style={btn(tab === "ELECTION_PARTIES")}
            >
              Parties
            </button>

            <button
              type="button"
              onClick={() => setTab("ELECTION_CANDIDATES")}
              style={btn(tab === "ELECTION_CANDIDATES")}
            >
              Candidates
            </button>

            <button
              type="button"
              onClick={() => setTab("CONTESTS")}
              style={btn(tab === "CONTESTS")}
            >
              Contests
            </button>

            {selectedContestId ? (
              <button
                type="button"
                onClick={() => setTab("CONTEST_OPTIONS")}
                style={btn(tab === "CONTEST_OPTIONS")}
              >
                Contest Options
              </button>
            ) : null}

            {/* ✅ NEW: Normalization tab */}
            <button
              type="button"
              onClick={() => setTab("SUBMISSION_NORMALIZATION")}
              style={btn(tab === "SUBMISSION_NORMALIZATION")}
            >
              Normalize
            </button>

            <span style={{ width: 10 }} />

            <button
              type="button"
              onClick={() => setTab("MASTER_PARTIES")}
              style={btn(tab === "MASTER_PARTIES", true)}
            >
              Master Party
            </button>

            <button
              type="button"
              onClick={() => setTab("MASTER_CANDIDATES")}
              style={btn(tab === "MASTER_CANDIDATES", true)}
            >
              Master Candidate
            </button>

            <Badge
              text={canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
            />
          </div>
        }
      >
        {tab === "ELECTION_PARTIES" ? <ElectionPartiesTab /> : null}
        {tab === "ELECTION_CANDIDATES" ? <ElectionCandidatesTab /> : null}

        {tab === "CONTESTS" ? (
          <ContestsTab onOpenOptions={openContestOptions} />
        ) : null}

        {tab === "CONTEST_OPTIONS" ? (
          <ContestOptionsPage
            contestId={selectedContestId}
            onBack={goBackToContests}
          />
        ) : null}

        {/* ✅ NEW */}
        {tab === "SUBMISSION_NORMALIZATION" ? (
          <SubmissionNormalizationTab />
        ) : null}

        {tab === "MASTER_PARTIES" ? <PartiesMasterTab /> : null}
        {tab === "MASTER_CANDIDATES" ? <CandidatesMasterTab /> : null}
      </Panel>
    </div>
  );
}

function btn(active: boolean, master = false) {
  return {
    padding: "8px 10px",
    borderRadius: 10,
    border: "1px solid #e5e7eb",
    background: active ? "#f3f4f6" : master ? "#F8F8FF" : "#fff",
    fontWeight: 700,
  } as const;
}

// // src/pages/elections/workspace/tabs/setup/SetupTab.tsx

// import { useState } from "react";
// import { useAuth } from "../../../../../auth/useAuth";
// import { Panel, Badge } from "../../../shared/elections-ui";

// import type { SetupSubTab } from "./setup.types";

// import ElectionPartiesTab from "./election/ElectionPartiesTab";
// import ElectionCandidatesTab from "./election/ElectionCandidatesTab";
// import ContestsTab from "./election/ContestsTab";
// import ContestOptionsPage from "./election/ContestOptionsPage";

// import PartiesMasterTab from "./masters/PartiesMasterTab";
// import CandidatesMasterTab from "./masters/CandidatesMasterTab";

// export default function SetupTab() {
//   const { dashboardMode } = useAuth();
//   const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

//   const [tab, setTab] = useState<SetupSubTab>("ELECTION_PARTIES");
//   const [selectedContestId, setSelectedContestId] = useState<string | null>(
//     null
//   );

//   const openContestOptions = (contestId: string) => {
//     setSelectedContestId(contestId);
//     setTab("CONTEST_OPTIONS");
//   };

//   const goBackToContests = () => {
//     setTab("CONTESTS");
//   };

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
//       <Panel
//         title="Setup"
//         right={
//           <div
//             style={{
//               display: "flex",
//               gap: 8,
//               alignItems: "center",
//               flexWrap: "wrap",
//             }}
//           >
//             <button
//               type="button"
//               onClick={() => setTab("ELECTION_PARTIES")}
//               style={{
//                 padding: "8px 10px",
//                 borderRadius: 10,
//                 border: "1px solid #e5e7eb",
//                 background: "#fff",
//                 fontWeight: 700,
//               }}
//             >
//               Parties
//             </button>

//             <button
//               type="button"
//               onClick={() => setTab("ELECTION_CANDIDATES")}
//               style={{
//                 padding: "8px 10px",
//                 borderRadius: 10,
//                 border: "1px solid #e5e7eb",
//                 background: "#fff",
//                 fontWeight: 700,
//               }}
//             >
//               Candidates
//             </button>

//             <button
//               type="button"
//               onClick={() => setTab("CONTESTS")}
//               style={{
//                 padding: "8px 10px",
//                 borderRadius: 10,
//                 border: "1px solid #e5e7eb",
//                 background: "#fff",
//                 fontWeight: 700,
//               }}
//             >
//               Contests
//             </button>

//             {selectedContestId ? (
//               <button
//                 type="button"
//                 onClick={() => setTab("CONTEST_OPTIONS")}
//                 style={{
//                   padding: "8px 10px",
//                   borderRadius: 10,
//                   border: "1px solid #e5e7eb",
//                   background: "#fff",
//                   fontWeight: 700,
//                 }}
//               >
//                 Contest Options
//               </button>
//             ) : null}

//             <span style={{ width: 10 }} />

//             <button
//               type="button"
//               onClick={() => setTab("MASTER_PARTIES")}
//               style={{
//                 padding: "8px 10px",
//                 borderRadius: 10,
//                 border: "1px solid #e5e7eb",
//                 background: "#F8F8FF",
//                 fontWeight: 700,
//               }}
//             >
//               Master Party
//             </button>

//             <button
//               type="button"
//               onClick={() => setTab("MASTER_CANDIDATES")}
//               style={{
//                 padding: "8px 10px",
//                 borderRadius: 10,
//                 border: "1px solid #e5e7eb",
//                 background: "#F8F8FF",
//                 fontWeight: 700,
//               }}
//             >
//               Master Candidate
//             </button>

//             <Badge
//               text={canEdit ? "Editable (NEC/SYSTEM)" : "Read-only (Tenant)"}
//             />
//           </div>
//         }
//       >
//         {tab === "ELECTION_PARTIES" ? <ElectionPartiesTab /> : null}
//         {tab === "ELECTION_CANDIDATES" ? <ElectionCandidatesTab /> : null}

//         {tab === "CONTESTS" ? (
//           <ContestsTab onOpenOptions={openContestOptions} />
//         ) : null}

//         {tab === "CONTEST_OPTIONS" ? (
//           <ContestOptionsPage
//             contestId={selectedContestId}
//             onBack={goBackToContests}
//           />
//         ) : null}

//         {tab === "MASTER_PARTIES" ? <PartiesMasterTab /> : null}
//         {tab === "MASTER_CANDIDATES" ? <CandidatesMasterTab /> : null}
//       </Panel>
//     </div>
//   );
// }
