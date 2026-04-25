


// ✅ FILE: src/pages/elections/workspace/tabs/submissions/AmendSubmissionModal.tsx
//
// ✅ STYLE MATCH: SubmissionFormModal.tsx
// - Same modal wrapper, header, sections, stats pills, footer buttons
// - Two-column layout: LEFT (reason + votes) | RIGHT (summary + ballots)
// - No full modal scroll; only Candidate table scrolls when needed
//
// ✅ RULE ALIGNMENT (BallotsInBox)
// - ballotsInBox = validVotes + invalid + rejected + unmarked
// - invalidTotal = invalid + rejected + unmarked
// - spoiledBallots is OUTSIDE the box
// - outsideBox = unused + spoiled
//
// ✅ Backend call
// - amendSubmission(submissionId, { actorUserId, reason, candidateVotes, ballotsInBox, invalidBallots, rejectedBallots, unmarkedBallots, spoiledBallots, unusedBallots })

import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FilePenLine, X } from "lucide-react";

import {
  amendSubmission,
  getSubmission,
  type VoteSubmissionDto,
} from "../../../../../shared/services/voteSubmissionService";

import {
  listOptionsByContest,
  type ContestOptionDto,
} from "../../../../../shared/services/contestOptionService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any) {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}
function clampNum(n: any) {
  const v = Number(n);
  if (!isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}
function sumVotes(map: Record<string, number>) {
  return Object.values(map ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
}

export default function AmendSubmissionModal(props: {
  open: boolean;
  onClose: () => void;

  submissionId?: string;

  actorUserId: string;
  actorName?: string;

  onSaved: () => void | Promise<void>;
}) {
  const visible = Boolean(props.open);

  /** ---------------- Load submission ---------------- */
  const sQ = useQuery<VoteSubmissionDto>({
    enabled: visible && Boolean(props.submissionId),
    queryKey: ["vote-submission", "amend", props.submissionId],
    queryFn: () => getSubmission(props.submissionId as string),
    staleTime: 0,
    retry: 1,
  });

  const submission: any = sQ.data;

  /** ---------------- Contest + candidates ---------------- */
  const contestId = String(submission?.contestId ?? "");
  const optionsQ = useQuery<ContestOptionDto[]>({
    enabled: visible && Boolean(contestId),
    queryKey: ["contest-options", "amend", contestId],
    queryFn: () =>
      listOptionsByContest({
        contestId,
        onlyActive: true,
      }) as any,
    staleTime: 60_000,
    retry: 1,
  });

  const candidateOptions = useMemo(() => {
    const opts = optionsQ.data ?? [];
    return (opts as any[])
      .filter((o) => String(o?.optionType ?? "").toUpperCase() === "CANDIDATE")
      .sort((a, b) => (a.optionOrder ?? 0) - (b.optionOrder ?? 0));
  }, [optionsQ.data]);

  /** ---------------- Form state ---------------- */
  const [reason, setReason] = useState("");

  const [candidateVotes, setCandidateVotes] = useState<Record<string, number>>(
    {}
  );
  const [invalidBallots, setInvalidBallots] = useState<number | "">("");
  const [rejectedBallots, setRejectedBallots] = useState<number | "">("");
  const [unmarkedBallots, setUnmarkedBallots] = useState<number | "">("");
  const [spoiledBallots, setSpoiledBallots] = useState<number | "">("");
  const [unusedBallots, setUnusedBallots] = useState<number | "">("");

  /** ---------------- Hydrate when open ---------------- */
  useEffect(() => {
    if (!visible) return;
    if (!submission) return;

    setReason("");

    setCandidateVotes(submission?.candidateVotes ?? {});
    setInvalidBallots(submission?.invalidBallots ?? "");
    setRejectedBallots(submission?.rejectedBallots ?? "");
    setUnmarkedBallots(submission?.unmarkedBallots ?? "");
    setSpoiledBallots(submission?.spoiledBallots ?? "");
    setUnusedBallots(submission?.unusedBallots ?? "");
  }, [visible, submission]);

  /** ---------------- Derived numbers (same rules as SubmissionFormModal) ---------------- */
  const validVotes = useMemo(() => sumVotes(candidateVotes), [candidateVotes]);

  const invalidTotalNumber = useMemo(() => {
    return (
      (Number(invalidBallots) || 0) +
      (Number(rejectedBallots) || 0) +
      (Number(unmarkedBallots) || 0)
    );
  }, [invalidBallots, rejectedBallots, unmarkedBallots]);

  // ✅ ballotsInBox EXCLUDES spoiled
  const ballotsInBoxNumber = useMemo(() => {
    return validVotes + invalidTotalNumber;
  }, [validVotes, invalidTotalNumber]);

  const outsideBoxNumber = useMemo(() => {
    return (Number(unusedBallots) || 0) + (Number(spoiledBallots) || 0);
  }, [unusedBallots, spoiledBallots]);

  const status = String(submission?.status ?? "—").toUpperCase();

  const reasonOk = Boolean(reason.trim());

  /** ---------------- Mutation ---------------- */
  const amendM = useMutation({
    mutationFn: async () => {
      if (!props.submissionId) throw new Error("submissionId is required");
      if (!props.actorUserId) throw new Error("actorUserId is required");
      if (!reason.trim()) throw new Error("Reason is required.");

      return amendSubmission(props.submissionId, {
        actorUserId: props.actorUserId,
        reason: reason.trim(),

        candidateVotes,

        // ✅ send ballotsInBox (auto)
        ballotsInBox: ballotsInBoxNumber,

        invalidBallots: invalidBallots === "" ? undefined : Number(invalidBallots),
        rejectedBallots:
          rejectedBallots === "" ? undefined : Number(rejectedBallots),
        unmarkedBallots:
          unmarkedBallots === "" ? undefined : Number(unmarkedBallots),
        spoiledBallots: spoiledBallots === "" ? undefined : Number(spoiledBallots),
        unusedBallots: unusedBallots === "" ? undefined : Number(unusedBallots),
      } as any);
    },
    onSuccess: async () => {
      await props.onSaved();
    },
  });

  const busy = sQ.isLoading || optionsQ.isLoading || amendM.isPending;

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => {
          if (busy) return;
          props.onClose();
        }}
      />

      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="
            w-full sm:max-w-3xl md:max-w-5xl lg:max-w-6xl
            bg-white rounded-t-2xl sm:rounded-2xl shadow-xl
            flex flex-col overflow-hidden
          "
          style={{
            // ✅ keep it compact; no full-page takeover
            maxHeight: "82vh",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* header */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-800 to-blue-600 text-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FilePenLine className="h-4 w-4" />
                  <div className="text-xl font-extrabold leading-5 py-4">
                    Amend Vote Submission
                  </div>
                </div>

                <div className="text-base text-slate-300 truncate mt-0.5">
                  Actor:{" "}
                  <span className="font-extrabold text-lg text-white px-3">
                    {props.actorName ?? "—"}
                  </span>
                  {" • "}
                  Submission ID:{" "}
                  <span className="font-mono">{props.submissionId ?? "—"}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={props.onClose}
                disabled={busy}
                className={`shrink-0 rounded-full border border-slate-200 bg-red-600 text-white font-bold h-9 w-9 grid place-items-center ${
                  busy ? "opacity-60" : "hover:bg-slate-500"
                }`}
                aria-label="Close"
                title="Close"
              >
                <X className="h-7 w-7" />
              </button>
            </div>

            {/* stats pills like SubmissionFormModal */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill label="Valid" value={String(validVotes)} />
              <Pill label="In Box" value={String(ballotsInBoxNumber)} />
              <Pill label="Invalid Total" value={String(invalidTotalNumber)} />
              <Pill label="Outside Box" value={String(outsideBoxNumber)} />
              <Pill label="Status" value={status} />
            </div>
          </div>

          {/* body (NO overall scroll) */}
          <div className="px-3 py-3">
            {sQ.isError ? (
              <Section>
                <div className="text-sm font-bold text-red-700">
                  {friendlyError(sQ.error)}
                </div>
              </Section>
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
              {/* LEFT */}
              <div className="space-y-3">
                <Section title="Amendment Reason">
                  <div className="text-[12px] font-extrabold text-slate-600 mb-1">
                    Reason (required)
                  </div>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                    placeholder="Explain what was wrong and what was corrected..."
                  />
                  {!reasonOk ? (
                    <div className="mt-1 text-[12px] font-bold text-red-700">
                      Reason is required.
                    </div>
                  ) : null}
                </Section>

                <Section
                  title="Candidate Votes"
                  right={
                    contestId ? (
                      <button
                        type="button"
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold hover:bg-slate-50"
                        onClick={() => setCandidateVotes({})}
                        disabled={busy}
                      >
                        Clear all
                      </button>
                    ) : null
                  }
                >
                  {!contestId ? (
                    <div className="text-sm text-slate-600">
                      Submission has no contestId.
                    </div>
                  ) : optionsQ.isLoading ? (
                    <div className="text-sm text-slate-600">
                      Loading candidates…
                    </div>
                  ) : optionsQ.isError ? (
                    <div className="text-sm font-bold text-red-700">
                      {friendlyError(optionsQ.error)}
                    </div>
                  ) : !candidateOptions.length ? (
                    <div className="text-sm text-slate-600">
                      No candidate options for this contest.
                    </div>
                  ) : (
                    // ✅ only this area scrolls if needed
                    <div
                      className="rounded-xl border border-slate-200 overflow-hidden"
                      style={{ maxHeight: "34vh" }}
                    >
                      <div className="overflow-y-auto">
                        <table className="w-full min-w-[480px]">
                          <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="text-left">
                              <th className="px-2.5 py-2 text-sm font-extrabold text-slate-600">
                                Candidate
                              </th>
                              <th className="px-2.5 py-2 text-sm font-extrabold text-slate-600 w-[120px]">
                                Party
                              </th>
                              <th className="px-2.5 py-2 text-sm font-extrabold text-slate-600 w-[120px] text-right">
                                Votes
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {candidateOptions.map((o: any, idx: number) => {
                              const voteKey = String(
                                o.electId ?? o.optionId ?? o.id ?? o.key
                              );
                              const votes = candidateVotes[voteKey] ?? 0;

                              const name =
                                o.electionCandidate ??
                                o.candidateName ??
                                o.optionLabel ??
                                o.label ??
                                o.name ??
                                voteKey;

                              const party =
                                o.abbreviation ??
                                o.partyAbbreviation ??
                                o.partyCode ??
                                o.partyName ??
                                "";

                              return (
                                <tr
                                  key={voteKey}
                                  className={`border-t border-slate-200 ${
                                    idx % 2 === 0
                                      ? "bg-white"
                                      : "bg-slate-50/40"
                                  }`}
                                >
                                  <td className="px-2.5 py-2 align-middle">
                                    <div className="text-base font-extrabold leading-5 break-words">
                                      {name}
                                    </div>
                                  </td>
                                  <td className="px-2.5 py-2 align-middle">
                                    <span
                                      className={`inline-flex rounded-full px-2 py-0.5 text-base font-extrabold ${
                                        party
                                          ? "bg-slate-100 text-slate-700"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {party || "—"}
                                    </span>
                                  </td>
                                  <td className="px-2.5 py-1.5 align-middle">
                                    <div className="flex justify-end">
                                      <input
                                        type="number"
                                        min={0}
                                        inputMode="numeric"
                                        value={String(votes)}
                                        onChange={(e) => {
                                          const n = clampNum(e.target.value);
                                          setCandidateVotes((s) => ({
                                            ...s,
                                            [voteKey]: n,
                                          }));
                                        }}
                                        className="h-7 w-[84px] rounded-md border border-slate-200 bg-white px-1.5 text-right text-lg font-extrabold leading-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </Section>
              </div>

              {/* RIGHT */}
              <div className="space-y-3">
                <Section title="Ballots Summary">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <ReadOnlyStat
                        label="Ballots In Box (auto)"
                        value={String(ballotsInBoxNumber)}
                      />
                    </div>

                    {/* ✅ side-by-side */}
                    <ReadOnlyStat
                      label="Invalid Total (auto)"
                      value={String(invalidTotalNumber)}
                    />
                    <ReadOnlyStat
                      label="Outside Box (auto)"
                      value={String(outsideBoxNumber)}
                    />

                    {/* edit fields */}
                    <NumberField
                      label="Invalid (In Box)"
                      value={invalidBallots}
                      onChange={setInvalidBallots}
                    />
                    <NumberField
                      label="Rejected (In Box)"
                      value={rejectedBallots}
                      onChange={setRejectedBallots}
                    />
                    <NumberField
                      label="Unmarked (In Box)"
                      value={unmarkedBallots}
                      onChange={setUnmarkedBallots}
                    />
                    <NumberField
                      label="Spoiled (Outside Box)"
                      value={spoiledBallots}
                      onChange={setSpoiledBallots}
                    />
                    <div className="col-span-2">
                      <NumberField
                        label="Unused (Outside Box)"
                        value={unusedBallots}
                        onChange={setUnusedBallots}
                      />
                    </div>
                  </div>
                </Section>

                {amendM.isError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                    {friendlyError(amendM.error)}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="sticky bottom-0 z-10 border-t bg-white px-3 py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 justify-end">
              <button
                type="button"
                onClick={props.onClose}
                disabled={busy}
                className={`h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold ${
                  busy ? "opacity-60" : "hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={busy || !reasonOk}
                onClick={() => {
                  amendM.mutate(undefined, {
                    onSuccess: () => props.onClose(),
                  });
                }}
                className={`h-10 w-full sm:w-auto rounded-xl px-5 text-sm font-extrabold text-white ${
                  busy || !reasonOk
                    ? "bg-slate-400"
                    : "bg-blue-800 hover:bg-black"
                }`}
              >
                Amend
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- small components (same style as SubmissionFormModal) ---------- */
function Section(props: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      {props.title ? (
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-base text-blue-600 font-extrabold">{props.title}</div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

function Pill(props: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-blue-800 px-3 py-1">
      <span className="text-[12px] text-red-300 font-extrabold">
        {props.label}
      </span>
      <span className="text-base font-extrabold text-white">{props.value}</span>
    </div>
  );
}

function ReadOnlyStat(props: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-sm font-extrabold text-slate-600">
        {props.label}
      </div>
      <div className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 grid items-center">
        <span className="text-lg font-extrabold text-slate-900">
          {props.value}
        </span>
      </div>
    </div>
  );
}

function NumberField(props: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
}) {
  return (
    <div>
      <div className="mb-1 text-sm font-extrabold text-slate-600">
        {props.label}
      </div>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={String(props.value)}
        onChange={(e) =>
          props.onChange(e.target.value === "" ? "" : clampNum(e.target.value))
        }
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-lg font-extrabold focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}

