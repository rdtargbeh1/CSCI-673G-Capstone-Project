// src/pages/elections/workspace/tabs/setup/election/SubmissionNormalizationTab.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import { useAuthStore } from "../../../../../../shared/store/authStore";
import { Panel, Badge, PlaceholderNote } from "../../../../shared/elections-ui";

import {
  listActiveElections,
  type ElectionDto,
} from "../../../../../../shared/services/electionService";

import { listContestsByElection } from "../../../../../../shared/services/contestService";
import type {
  ContestDto,
  ContestOptionDto,
} from "../../../../../../auth/contestTypes";

import { listOptionsByContest } from "../../../../../../shared/services/contestOptionService";

import {
  createOrUpdateSubmissionContestVote,
  listSubmissionContestVotes,
  type VoteSubmissionContestDto,
} from "../../../../../../shared/services/voteSubmissionContestService";

import {
  createOrUpdateSubmissionRanking,
  listRankingsBySubmission,
  type VoteSubmissionRankingDto,
} from "../../../../../../shared/services/voteSubmissionRankingService";

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

  // You told me: tenant + NEC require orgId; SYSTEM does not.
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

  // ✅ typed contests (fixes TS warning + removes bad casts)
  const contests: ContestDto[] = (contestsQ.data ?? []) as ContestDto[];

  const [contestId, setContestId] = useState<string>("");

  useEffect(() => {
    // auto-pick first contest when election changes
    if (!contestId && contests.length) {
      setContestId(contests[0].contestId);
    }
  }, [contests, contestId]);

  /** ---------------- Contest options (real data) ---------------- */
  const optionsQ = useQuery({
    enabled: Boolean(contestId),
    queryKey: ["contest-options", contestId],
    queryFn: () => listOptionsByContest({ contestId, onlyActive: true }),
    staleTime: 60_000,
    retry: 1,
  });

  const options: ContestOptionDto[] = (optionsQ.data ?? []) as any;

  /** ---------------- Submission context (manual for now) ---------------- */
  const [submissionId, setSubmissionId] = useState<string>("");

  /** ---------------- Create Contest Vote (VoteSubmissionContest) ---------------- */
  const [selectedOptionId, setSelectedOptionId] = useState<string>("");
  const [voteValue, setVoteValue] = useState<number>(0);
  const [rank, setRank] = useState<number | "">("");

  const canCreateContestVote =
    canWrite &&
    Boolean(submissionId) &&
    Boolean(electionId) &&
    Boolean(contestId) &&
    Boolean(selectedOptionId) &&
    (!needsOrg || Boolean(orgId));

  const createContestVoteM = useMutation({
    mutationFn: () =>
      createOrUpdateSubmissionContestVote({
        submissionId,
        orgId: orgId, // required for tenant/NEC in your rules
        electionId,
        contestId,
        optionId: selectedOptionId,
        voteValue: Number(voteValue) || 0,
        rank: rank === "" ? null : Number(rank),
      }),
  });

  /** ---------------- Read Contest Votes (list) ---------------- */
  const contestVotesQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["submission-contest-votes", submissionId, contestId],
    queryFn: () => listSubmissionContestVotes({ submissionId, contestId }),
    staleTime: 10_000,
    retry: 1,
  });
  const contestVotes: VoteSubmissionContestDto[] = contestVotesQ.data ?? [];

  /** ---------------- Create Ranking (VoteSubmissionRanking) ---------------- */
  const [rankingPick, setRankingPick] = useState<string[]>([]);

  // ranking = ordered optionIds
  const canCreateRanking =
    canWrite &&
    Boolean(submissionId) &&
    Boolean(contestId) &&
    rankingPick.length > 0;

  const createRankingM = useMutation({
    mutationFn: () =>
      createOrUpdateSubmissionRanking({
        submissionId,
        contestId,
        ranking: rankingPick,
      } as VoteSubmissionRankingDto),
  });

  /** ---------------- Read Rankings ---------------- */
  const rankingsQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["submission-rankings", submissionId],
    queryFn: () => listRankingsBySubmission(submissionId),
    staleTime: 10_000,
    retry: 1,
  });
  const rankings: VoteSubmissionRankingDto[] = rankingsQ.data ?? [];

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
          Read-only: you don’t have permission to manage normalization entities.
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

          {/* Contest */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>
              Contest
            </div>
            <select
              value={contestId}
              onChange={(e) => setContestId(e.target.value)}
              disabled={!electionId || contestsQ.isLoading}
              className="px-3 py-2 rounded border bg-white w-full"
            >
              <option value="">-- Select contest --</option>
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

          {/* SubmissionId (manual for now) */}
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: "#374151" }}>
              Submission ID (required to create)
            </div>
            <input
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              placeholder="Paste submission UUID here"
              className="px-3 py-2 rounded border w-full"
            />
            <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
              You said there are no submissions yet — once a submission exists,
              paste it here to create normalized rows.
            </div>
          </div>

          <PlaceholderNote
            title="What this page does"
            bullets={[
              "VoteSubmission = raw submission captured at polling place (candidateVotes JSON).",
              "VoteSubmissionContest = normalized rows per contest option (optionId + voteValue + optional rank).",
              "VoteSubmissionRanking = optional ordered list of optionIds for ranked-method contests.",
              "Tenant + NEC require orgId; SYSTEM does not.",
            ]}
          />
        </div>
      </Panel>

      {/* ---------------- VoteSubmissionContest create ---------------- */}
      <Panel title="VoteSubmissionContest (create / upsert)">
        <div className="grid gap-3">
          <div>
            <div className="text-[12px] font-extrabold text-slate-600">
              Contest Option
            </div>
            <select
              value={selectedOptionId}
              onChange={(e) => setSelectedOptionId(e.target.value)}
              disabled={!contestId || optionsQ.isLoading}
              className="px-3 py-2 rounded border bg-white w-full"
            >
              <option value="">-- Select option --</option>
              {options.map((o: any) => (
                <option key={o.optionId} value={o.optionId}>
                  {o.electionCandidate || o.optionLabel || o.optionId}
                </option>
              ))}
            </select>

            {optionsQ.isError ? (
              <div className="mt-2 text-sm font-bold text-red-600">
                {friendlyError(optionsQ.error)}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-[12px] font-extrabold text-slate-600">
                Vote Value
              </div>
              <input
                type="number"
                min={0}
                value={String(voteValue)}
                onChange={(e) => setVoteValue(Number(e.target.value || 0))}
                className="px-3 py-2 rounded border w-full"
              />
            </div>

            <div>
              <div className="text-[12px] font-extrabold text-slate-600">
                Rank (optional)
              </div>
              <input
                type="number"
                min={1}
                value={rank === "" ? "" : String(rank)}
                onChange={(e) =>
                  setRank(e.target.value === "" ? "" : Number(e.target.value))
                }
                className="px-3 py-2 rounded border w-full"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                disabled={!canCreateContestVote || createContestVoteM.isPending}
                onClick={() => {
                  createContestVoteM.mutate(undefined, {
                    onSuccess: () => {
                      contestVotesQ.refetch();
                    },
                  });
                }}
                className={`px-3 py-2 rounded border bg-white font-extrabold w-full ${
                  !canCreateContestVote || createContestVoteM.isPending
                    ? "opacity-60"
                    : ""
                }`}
              >
                Create / Upsert
              </button>
            </div>
          </div>

          {createContestVoteM.isError ? (
            <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
              {friendlyError(createContestVoteM.error)}
            </div>
          ) : null}

          <div className="text-sm font-bold text-slate-700">
            Existing normalized rows for this submission/contest:{" "}
            <strong>{contestVotes.length}</strong>
          </div>

          {contestVotes.map((r) => (
            <div
              key={r.scvId}
              className="p-2 rounded border border-slate-200 bg-white text-sm"
            >
              <div className="font-extrabold">
                {r.optionLabel || r.optionId}
              </div>
              <div className="text-slate-600">
                voteValue={r.voteValue} {r.rank != null ? `rank=${r.rank}` : ""}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ---------------- VoteSubmissionRanking create ---------------- */}
      <Panel title="VoteSubmissionRanking (create / upsert)">
        <div className="grid gap-3">
          <div className="text-sm text-slate-600">
            Ranking is only meaningful if the contest voteMethod is{" "}
            <strong>RANKED</strong>. For Liberia’s normal single-choice
            contests, you typically don’t use this table.
          </div>

          <div>
            <div className="text-[12px] font-extrabold text-slate-600">
              Pick ordered optionIds (first = highest)
            </div>

            <div className="grid gap-2">
              {options.map((o: any) => {
                const id = o.optionId as string;
                const label = o.electionCandidate || o.optionLabel || id;
                const checked = rankingPick.includes(id);

                return (
                  <label key={id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const on = e.target.checked;
                        setRankingPick((prev) => {
                          if (on) return [...prev, id]; // append at end (order)
                          return prev.filter((x) => x !== id);
                        });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>

            {rankingPick.length ? (
              <div className="mt-2 text-xs text-slate-600">
                Current order: <strong>{rankingPick.join(" → ")}</strong>
              </div>
            ) : null}
          </div>

          <button
            type="button"
            disabled={!canCreateRanking || createRankingM.isPending}
            onClick={() => {
              createRankingM.mutate(undefined, {
                onSuccess: () => rankingsQ.refetch(),
              });
            }}
            className={`px-3 py-2 rounded border bg-white font-extrabold ${
              !canCreateRanking || createRankingM.isPending ? "opacity-60" : ""
            }`}
          >
            Create / Upsert Ranking
          </button>

          {createRankingM.isError ? (
            <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
              {friendlyError(createRankingM.error)}
            </div>
          ) : null}

          <div className="text-sm font-bold text-slate-700">
            Rankings for this submission: <strong>{rankings.length}</strong>
          </div>

          {rankings.map((r, idx) => (
            <div
              key={r.svrId ?? `${idx}`}
              className="p-2 rounded border border-slate-200 bg-white text-sm"
            >
              <div className="font-extrabold">
                Contest: {r.contestName || r.contestId}
              </div>
              <div className="text-slate-600">
                ranking: {JSON.stringify(r.ranking)}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
