
import  { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Panel, Badge, PlaceholderNote } from "../../../../shared/elections-ui";

import {
  listActiveElections,
  type ElectionDto,
} from "../../../../../../shared/services/electionService";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type { ContestDto } from "../../../../../../auth/contestTypes";

import {
  normalizeSubmission,
  normalizeVerifiedSubmissionsRun,
  searchNormalizedSubmissionContestVotes,
  type VoteSubmissionContestSearchRow,
} from "../../../../../../shared/services/voteSubmissionContestService";

/** helpers */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}

export default function SubmissionNormalizationTab() {
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  const needsOrg = dashboardMode === "TENANT" || dashboardMode === "NEC";
  const orgId = currentOrgId || "";

  const canWrite =
    dashboardMode === "TENANT" ||
    dashboardMode === "NEC" ||
    dashboardMode === "SYSTEM";

  /** ---------------- Elections ---------------- */
  const electionsQ = useQuery({
    queryKey: ["elections", "active"],
    queryFn: () => listActiveElections(),
    staleTime: 60_000,
    retry: 1,
  });
  const elections = electionsQ.data ?? [];

  const [electionId, setElectionId] = useState<string>("");

  useEffect(() => {
    if (!electionId && elections.length) {
      const sorted = [...elections].sort(
        (a, b) => (b.year ?? 0) - (a.year ?? 0)
      );
      setElectionId(sorted[0].electionId);
    }
  }, [elections, electionId]);

  const electionName = useMemo(() => {
    return (
      elections.find((e) => e.electionId === electionId)?.electionName ?? "—"
    );
  }, [elections, electionId]);

  /** ---------------- Contests ---------------- */
  const contestsQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: ["contests", "by-election", electionId],
    queryFn: () => listContestsByElection(electionId),
    staleTime: 60_000,
    retry: 1,
  });

  const contests: ContestDto[] = (contestsQ.data ?? []) as ContestDto[];

  const [contestId, setContestId] = useState<string>("");

  useEffect(() => {
    if (!contestId && contests.length) {
      setContestId(contests[0].contestId);
    }
  }, [contests, contestId]);

  /** ---------------- Submission context ---------------- */
  const [submissionId, setSubmissionId] = useState<string>("");

  /** ---------------- Normalize (official flow) ---------------- */
  const canNormalizeOne =
    canWrite &&
    Boolean(submissionId) &&
    Boolean(electionId) &&
    (!needsOrg || Boolean(orgId));

  const normalizeOneM = useMutation({
    mutationFn: () =>
      normalizeSubmission({
        orgId,
        electionId,
        submissionId,
      }),
  });

  const canNormalizeVerified =
    canWrite && Boolean(electionId) && (!needsOrg || Boolean(orgId));

  const normalizeVerifiedM = useMutation({
    mutationFn: () =>
      normalizeVerifiedSubmissionsRun({
        orgId,
        electionId,
      }),
  });

  /** ---------------- Read normalized rows (search) ----------------
   * This shows normalized data for the election (optionally filtered by contest)
   */
  const rowsQ = useQuery({
    enabled: Boolean(orgId) && Boolean(electionId),
    queryKey: ["normalize-search", orgId, electionId, contestId],
    queryFn: () =>
      searchNormalizedSubmissionContestVotes({
        orgId,
        electionId,
        contestId: contestId || undefined,
        page: 0,
        size: 50,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const rows: VoteSubmissionContestSearchRow[] = rowsQ.data?.content ?? [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!canWrite ? (
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #e5e7eb",
            background: "#fff",
            color: "#6b7280",
            fontWeight: 700,
          }}
        >
          Read-only: you don’t have permission to run normalization.
        </div>
      ) : null}

      <Panel
        title="Submission Normalization"
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Badge text={`Mode: ${dashboardMode}`} />
            {needsOrg && !orgId ? (
              <Badge text="Org required (select org first)" />
            ) : null}
          </div>
        }
      >
        <div style={{ display: "grid", gap: 10 }}>
          {/* Election */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>
              Election
            </div>
            <select
              value={electionId}
              onChange={(e) => {
                setElectionId(e.target.value);
                setContestId("");
              }}
              className="px-3 py-2 rounded border bg-white w-full"
            >
              {elections.map((el: ElectionDto) => (
                <option key={el.electionId} value={el.electionId}>
                  {el.electionName} ({el.year})
                </option>
              ))}
            </select>

            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              Selected: <strong>{electionName}</strong>
            </div>
          </div>

          {/* Contest filter for the table */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>
              Contest (filter table)
            </div>
            <select
              value={contestId}
              onChange={(e) => setContestId(e.target.value)}
              disabled={!electionId || contestsQ.isLoading}
              className="px-3 py-2 rounded border bg-white w-full"
            >
              <option value="">-- All contests --</option>
              {contests.map((ct) => (
                <option key={ct.contestId} value={ct.contestId}>
                  {ct.contestName}
                </option>
              ))}
            </select>

            {contestsQ.isError ? (
              <div className="mt-2 text-sm font-bold text-red-600">
                {friendlyError(contestsQ.error)}
              </div>
            ) : null}
          </div>

          {/* Submission ID (for normalize one) */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>
              Submission ID (to normalize one submission)
            </div>
            <input
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              placeholder="Paste submission UUID here"
              className="px-3 py-2 rounded border w-full"
            />
          </div>

          <PlaceholderNote
            title="How normalization works (final)"
            bullets={[
              "VoteSubmission is the source of truth (candidateVotes JSON).",
              "VoteSubmissionContest is derived and should be treated as read-only.",
              "Use 'Normalize Submission' after a submission is verified/updated.",
              "Use 'Normalize Verified' to rebuild normalized rows for the whole election.",
            ]}
          />

          {/* Actions */}
          <div className="grid gap-2 md:grid-cols-2">
            <button
              type="button"
              disabled={!canNormalizeOne || normalizeOneM.isPending}
              onClick={() => {
                normalizeOneM.mutate(undefined, {
                  onSuccess: () => rowsQ.refetch(),
                });
              }}
              className={`px-3 py-2 rounded border bg-white font-extrabold w-full ${
                !canNormalizeOne || normalizeOneM.isPending ? "opacity-60" : ""
              }`}
            >
              Normalize Submission
            </button>

            <button
              type="button"
              disabled={!canNormalizeVerified || normalizeVerifiedM.isPending}
              onClick={() => {
                normalizeVerifiedM.mutate(undefined, {
                  onSuccess: () => rowsQ.refetch(),
                });
              }}
              className={`px-3 py-2 rounded border bg-white font-extrabold w-full ${
                !canNormalizeVerified || normalizeVerifiedM.isPending
                  ? "opacity-60"
                  : ""
              }`}
            >
              Normalize Verified (Election)
            </button>
          </div>

          {/* Errors */}
          {normalizeOneM.isError ? (
            <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
              {friendlyError(normalizeOneM.error)}
            </div>
          ) : null}

          {normalizeVerifiedM.isError ? (
            <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
              {friendlyError(normalizeVerifiedM.error)}
            </div>
          ) : null}
        </div>
      </Panel>

      {/* ---------------- Table (read-only) ---------------- */}
      <Panel title="Normalized Rows (read-only)">
        {rowsQ.isError ? (
          <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
            {friendlyError(rowsQ.error)}
          </div>
        ) : null}

        <div className="text-sm font-bold text-slate-700 mb-2">
          Rows: <strong>{rows.length}</strong>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr className="text-xs font-extrabold text-slate-700">
                <th className="px-3 py-2">Center</th>
                <th className="px-3 py-2">Contest</th>
                <th className="px-3 py-2">Candidate</th>
                <th className="px-3 py-2">Votes</th>
                <th className="px-3 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.scvId} className="border-t">
                  <td className="px-3 py-2">{r.centerName ?? "—"}</td>
                  <td className="px-3 py-2">{r.contestName ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.candidateFullName ?? r.optionLabel ?? "—"}
                  </td>
                  <td className="px-3 py-2">{r.voteValue ?? 0}</td>
                  <td className="px-3 py-2">
                    {r.dateCreated ? new Date(r.dateCreated).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {!rowsQ.isLoading && rows.length === 0 ? (
            <div className="p-4 text-center text-xs font-extrabold text-slate-600">
              No rows found
            </div>
          ) : null}
        </div>
      </Panel>
    </div>
  );
}

