
// src/pages/elections/workspace/tabs/results/official/candidates/OfficialCandidateCentersPage.tsx

import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";

type OfficialCandidateCenterRow = {
  electionId: string;
  contestId: string;

  countyName: string;
  districtName: string;

  centerCode: string;
  centerName: string;

  candidateName: string;
  partyName?: string;

  candidateVotes: number;
  centerValidVotes: number;
  voteSharePct: number;
};

export default function OfficialCandidateCentersPage() {
  const { electionId } = useParams();
  const [sp] = useSearchParams();
  const contestId = sp.get("contestId");

  /**
   * 🔧 PLACEHOLDER DATA
   * API → /api/stats/official/candidate/centers
   */
  const rows: OfficialCandidateCenterRow[] = useMemo(
    () => [
      {
        electionId: electionId ?? "—",
        contestId: contestId ?? "—",
        countyName: "Montserrado",
        districtName: "District 10",
        centerCode: "PC-100",
        centerName: "B.W. Harris School",
        candidateName: "John Doe",
        partyName: "Unity Party",
        candidateVotes: 450,
        centerValidVotes: 880,
        voteSharePct: 51.14,
      },
    ],
    [electionId, contestId]
  );

  return (
    <PageShell
      title="Official Candidate Results • Centers"
      source="v_candidate_center_stats_official"
      rows={rows.map((r, i) => (
        <Row key={i} {...r} />
      ))}
    />
  );
}

function PageShell(props: { title: string; source: string; rows: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-4 text-lg font-extrabold">{props.title}</div>
      <div className="space-y-2">{props.rows}</div>
      <div className="mt-3 text-xs text-slate-500">
        Data source: <code>{props.source}</code>
      </div>
    </div>
  );
}

function Row(props: OfficialCandidateCenterRow) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm">
      <div className="font-bold">
        {props.candidateName} ({props.partyName ?? "Independent"})
      </div>
      <div className="text-xs text-slate-600">
        {props.countyName} • {props.districtName} • {props.centerCode} —{" "}
        {props.centerName}
      </div>
      <div className="mt-1">
        Votes: {props.candidateVotes.toLocaleString()} /{" "}
        {props.centerValidVotes.toLocaleString()} •{" "}
        {props.voteSharePct.toFixed(2)}%
      </div>
    </div>
  );
}

