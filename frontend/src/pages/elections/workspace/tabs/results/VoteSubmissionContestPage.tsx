

import { useMemo, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { Panel, Badge } from "../../../shared/elections-ui";

import {
  searchNormalizedSubmissionContestVotes,
  type VoteSubmissionContestSearchRow,
} from "../../../../../shared/services/voteSubmissionContestService";

import { listContestsByElection } from "../../../../../shared/services/contestService";
import { fetchElectionCandidates } from "../../../../../shared/services/electionCandidateService";
import { fetchCounties } from "../../../../../shared/services/countyService";
import { fetchDistrictsByCounty } from "../../../../../shared/services/districtService";
import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";

import { fetchOrganizationById } from "../../../../../shared/services/organizationService";
import { fetchElectionById } from "../../../../../shared/services/electionService";

type OutletCtx = { orgId?: string };

function formatCandidateWithParty(r: VoteSubmissionContestSearchRow): string {
  const name = r.candidateFullName ?? r.optionLabel ?? "—";
  const abbr = r.partyAbbreviation ?? "";
  return abbr ? `${name} (${abbr})` : name;
}

export default function VoteSubmissionContestPage() {
  const { orgId } = useOutletContext<OutletCtx>();
  const { electionId } = useParams();

  const [countyId, setCountyId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [centerId, setCenterId] = useState<string>("");
  const [contestId, setContestId] = useState<string>("");
  const [candidateId, setCandidateId] = useState<string>("");

  const [page, setPage] = useState(0);
  const size = 25;

  /* ---------------- Lookups ---------------- */

  const orgQ = useQuery({
    queryKey: ["org", orgId],
    queryFn: () => fetchOrganizationById(String(orgId)),
    enabled: !!orgId,
  });

  const electionQ = useQuery({
    queryKey: ["election", electionId],
    queryFn: () => fetchElectionById(String(electionId)),
    enabled: !!electionId,
  });

  /* ---------------- Filters Data ---------------- */

  const countiesQ = useQuery({
    queryKey: ["counties"],
    queryFn: () => fetchCounties({ page: 0, size: 200 }),
  });

  const districtsQ = useQuery({
    queryKey: ["districts", countyId],
    queryFn: () => fetchDistrictsByCounty(countyId),
    enabled: !!countyId,
  });

  const centersQ = useQuery({
    queryKey: ["centers", countyId, districtId],
    queryFn: () =>
      fetchPollingCenters({
        page: 0,
        size: 300,
        countyId,
        districtId,
      }),
    enabled: !!districtId,
  });

  const contestsQ = useQuery({
    queryKey: ["contests", electionId],
    queryFn: () => listContestsByElection(String(electionId)),
    enabled: !!electionId,
  });

  const electionCandidatesQ = useQuery({
    queryKey: ["election-candidates", electionId],
    queryFn: () => fetchElectionCandidates(String(electionId)),
    enabled: !!electionId,
  });

  /* ---------------- Table Data ---------------- */

  const rowsQ = useQuery({
    queryKey: [
      "normalize-search",
      orgId,
      electionId,
      countyId,
      districtId,
      centerId,
      contestId,
      candidateId,
      page,
    ],
    queryFn: () =>
      searchNormalizedSubmissionContestVotes({
        orgId: String(orgId),
        electionId: String(electionId),
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId: centerId || undefined,
        contestId: contestId || undefined,
        candidateId: candidateId || undefined,
        page,
        size,
      }),
    enabled: !!orgId && !!electionId,
  });

  const rows = rowsQ.data?.content ?? [];

  const filteredElectionCandidates = useMemo(() => {
    return electionCandidatesQ.data ?? [];
  }, [electionCandidatesQ.data]);

  const clearFilters = () => {
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setContestId("");
    setCandidateId("");
    setPage(0);
  };

  const orgName = orgQ.data?.orgName ?? "—";
  const electionName = electionQ.data?.electionName ?? "—";

  return (
    <div className="flex flex-col gap-2">
      <Panel
        title="Normalized Contest Votes"
        right={<Badge text={orgId ?? "—"} />}
      >
        {/* -------- Compact Inline Filters -------- */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={countyId}
            onChange={(e) => {
              setCountyId(e.target.value);
              setDistrictId("");
              setCenterId("");
              setPage(0);
            }}
            className="h-8 w-[140px] rounded-lg border px-2 text-base font-bold"
          >
            <option value="">Counties</option>
            {countiesQ.data?.items.map((c) => (
              <option key={c.countyId} value={c.countyId}>
                {c.countyName}
              </option>
            ))}
          </select>

          <select
            value={districtId}
            onChange={(e) => {
              setDistrictId(e.target.value);
              setCenterId("");
              setPage(0);
            }}
            disabled={!countyId}
            className="h-8 w-[140px] rounded-lg border px-2 text-base font-bold"
          >
            <option value="">Districts</option>
            {districtsQ.data?.map((d) => (
              <option key={d.districtId} value={d.districtId}>
                {d.districtName}
              </option>
            ))}
          </select>

          <select
            value={centerId}
            onChange={(e) => {
              setCenterId(e.target.value);
              setPage(0);
            }}
            disabled={!districtId}
            className="h-8 w-[180px] rounded-lg border px-2 text-base font-bold"
          >
            <option value="">Centers</option>
            {centersQ.data?.items.map((c) => (
              <option key={c.centerId} value={c.centerId}>
                {c.centerName}
              </option>
            ))}
          </select>

          <select
            value={contestId}
            onChange={(e) => {
              setContestId(e.target.value);
              setCandidateId("");
              setPage(0);
            }}
            className="h-8 w-[150px] rounded-lg border px-2 text-base font-bold"
          >
            <option value="">Contests</option>
            {contestsQ.data?.map((c) => (
              <option key={c.contestId} value={c.contestId}>
                {c.contestName}
              </option>
            ))}
          </select>

          <select
            value={candidateId}
            onChange={(e) => {
              setCandidateId(e.target.value);
              setPage(0);
            }}
            className="h-8 w-[190px] rounded-lg border px-2 text-base font-bold"
          >
            <option value="">Candidates</option>
            {filteredElectionCandidates.map((ec: any) => (
              <option key={ec.candidateId ?? ec.electId} value={ec.candidateId}>
                {ec.fullName}
              </option>
            ))}
          </select>

          {/* Clear Button Inline */}
          <button
            onClick={clearFilters}
            className="h-8 rounded-lg border px-3 text-base font-bold"
          >
            Clear
          </button>
        </div>

        {/* -------- Table -------- */}
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-lg">
            <thead className="bg-slate-50">
              <tr className="text-lg font-extrabold text-slate-700">
                <th className="px-3 py-2">Center</th>
                <th className="px-3 py-2">Org</th>
                <th className="px-3 py-2">Election</th>
                <th className="px-3 py-2">Contest</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Votes</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r: VoteSubmissionContestSearchRow) => (
                <tr key={r.scvId} className="border-t">
                  <td className="px-3 py-2">{r.centerName ?? "—"}</td>
                  <td className="px-3 py-2">{orgName}</td>
                  <td className="px-3 py-2">{electionName}</td>
                  <td className="px-3 py-2">{r.contestName ?? "—"}</td>
                  <td className="px-3 py-2">{formatCandidateWithParty(r)}</td>
                  <td className="px-3 py-2">{r.voteValue ?? 0}</td>
                  <td className="px-3 py-2">
                    {r.dateCreated
                      ? new Date(r.dateCreated).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {rows.length === 0 && !rowsQ.isLoading && (
            <div className="p-4 text-center text-xs font-extrabold text-slate-600">
              No rows found
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}


