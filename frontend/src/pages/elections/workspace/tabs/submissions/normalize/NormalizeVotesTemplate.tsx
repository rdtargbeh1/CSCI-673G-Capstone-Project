// src/pages/elections/workspace/tabs/submissions/normalize/NormalizeVotesTemplate.tsx

import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../../../../auth/useAuth";
import {
  Panel,
  SimpleTable,
  PlaceholderNote,
  Badge,
} from "../../../../shared/elections-ui";

import {
  listScvBySubmission,
  listRankingsBySubmission,
  createOrUpdateScv,
  updateScv,
  deleteScv,
  replaceContestVotes,
  normalizeSubmission,
  normalizeVerifiedSubmissionsForElection,
  createOrUpdateRanking,
  deleteRanking,
  type VoteSubmissionContestDto,
  type VoteSubmissionContestBulkRequest,
  type VoteSubmissionContestCreateRequest,
  type VoteSubmissionContestUpdateRequest,
  type VoteSubmissionRankingDto,
} from "../../../../../../shared/services/normalizeService";

export default function NormalizeVotesTemplate() {
  const qc = useQueryClient();

  const { dashboardMode, currentOrgId, currentElectionId } = useAuth() as any;

  // You said: TENANT + NEC require orgId. SYSTEM may not have org.
  // Also: SYSTEM can access tenant by selecting org with org dropdown.
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // form fields
  const [submissionId, setSubmissionId] = useState("");
  const [contestId, setContestId] = useState("");

  // context
  const [orgId, setOrgId] = useState("");
  const [electionId, setElectionId] = useState("");

  const [bulkJson, setBulkJson] = useState(
    `[\n  { "optionId": "00000000-0000-0000-0000-000000000000", "voteValue": 10 },\n  { "optionId": "00000000-0000-0000-0000-000000000001", "voteValue": 5 }\n]`
  );

  const [rankingJson, setRankingJson] = useState(
    `["00000000-0000-0000-0000-000000000000","00000000-0000-0000-0000-000000000001"]`
  );

  // edit SCV
  const [editingScv, setEditingScv] = useState<VoteSubmissionContestDto | null>(
    null
  );
  const [editVoteValue, setEditVoteValue] = useState<number | "">("");
  const [editRank, setEditRank] = useState<number | null | "">("");

  // Create SCV modal
  const [addScvOpen, setAddScvOpen] = useState(false);
  const [newOptionId, setNewOptionId] = useState("");
  const [newVoteValue, setNewVoteValue] = useState<number | "">(0);
  const [newRank, setNewRank] = useState<number | null | "">("");

  // Create/Edit Ranking modal
  const [addRankingOpen, setAddRankingOpen] = useState(false);
  const [editingRanking, setEditingRanking] = useState<any | null>(null);
  const [editingRankingJson, setEditingRankingJson] =
    useState<string>(rankingJson);
  const [newRankingJson, setNewRankingJson] = useState<string>(rankingJson);

  // ---- Auto sync org/election from auth context (NO render loops) ----
  useEffect(() => {
    if (!electionId && currentElectionId)
      setElectionId(String(currentElectionId));

    if (
      (dashboardMode === "TENANT" || dashboardMode === "NEC") &&
      currentOrgId
    ) {
      if (orgId !== String(currentOrgId)) setOrgId(String(currentOrgId));
    } else if (dashboardMode === "SYSTEM") {
      if (currentOrgId && orgId !== String(currentOrgId))
        setOrgId(String(currentOrgId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardMode, currentOrgId, currentElectionId]);

  // org requirement depends on action
  const orgRequired = dashboardMode === "TENANT" || dashboardMode === "NEC";
  const resolvedOrgId = orgId || (currentOrgId ? String(currentOrgId) : "");

  function requireOrgForWrite(actionName: string): boolean {
    if (!resolvedOrgId) {
      const msg =
        dashboardMode === "SYSTEM"
          ? `Missing org context. Select an org from the org dropdown to run "${actionName}".`
          : `Missing orgId for this user. "${actionName}" requires orgId.`;
      alert(msg);
      return false;
    }
    return true;
  }

  function requireOrgForRanking(actionName: string): boolean {
    // Your rule: TENANT + NEC require org context for ranking writes too.
    // Ranking DTO doesn't include orgId, but we enforce context here.
    if (dashboardMode === "TENANT" || dashboardMode === "NEC") {
      if (!resolvedOrgId) {
        alert(`Missing orgId. "${actionName}" requires org context.`);
        return false;
      }
    } else if (dashboardMode === "SYSTEM") {
      // recommended: SYSTEM also select org for consistent tenant targeting
      if (!resolvedOrgId) {
        alert(`Select an org from the org dropdown to run "${actionName}".`);
        return false;
      }
    }
    return true;
  }

  // ---------------- Queries ----------------
  const scvQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["admin", "normalize", "scv", submissionId, contestId],
    queryFn: () => listScvBySubmission(submissionId, contestId || undefined),
    staleTime: 10_000,
    retry: 1,
  });

  const rankingsQ = useQuery({
    enabled: Boolean(submissionId),
    queryKey: ["admin", "submission-rankings", submissionId],
    queryFn: () => listRankingsBySubmission(submissionId),
    staleTime: 10_000,
    retry: 1,
  });

  // ---------------- Mutations ----------------
  const normalizeM = useMutation({
    mutationFn: (id: string) => normalizeSubmission(id),
    onSuccess: (_, id) =>
      qc.invalidateQueries({ queryKey: ["admin", "normalize", "scv", id] }),
  });

  const replaceM = useMutation({
    mutationFn: (req: VoteSubmissionContestBulkRequest) =>
      replaceContestVotes(req),
    onSuccess: (_, req) =>
      qc.invalidateQueries({
        queryKey: ["admin", "normalize", "scv", req.submissionId],
      }),
  });

  const backfillM = useMutation({
    mutationFn: (id: string) => normalizeVerifiedSubmissionsForElection(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "normalize"] }),
  });

  const createScvM = useMutation({
    mutationFn: (req: VoteSubmissionContestCreateRequest) =>
      createOrUpdateScv(req),
    onSuccess: (_, req) =>
      qc.invalidateQueries({
        queryKey: ["admin", "normalize", "scv", req.submissionId],
      }),
  });

  const updateScvM = useMutation({
    mutationFn: ({
      id,
      req,
    }: {
      id: string;
      req: VoteSubmissionContestUpdateRequest;
    }) => updateScv(id, req),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["admin", "normalize", "scv", submissionId],
      }),
  });

  const deleteScvM = useMutation({
    mutationFn: (id: string) => deleteScv(id),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["admin", "normalize", "scv", submissionId],
      }),
  });

  const rankM = useMutation({
    mutationFn: (dto: VoteSubmissionRankingDto) => createOrUpdateRanking(dto),
    onSuccess: (_, dto) =>
      qc.invalidateQueries({
        queryKey: ["admin", "submission-rankings", dto.submissionId],
      }),
  });

  const deleteRankM = useMutation({
    mutationFn: (svrId: string) => deleteRanking(svrId),
    onSuccess: () =>
      qc.invalidateQueries({
        queryKey: ["admin", "submission-rankings", submissionId],
      }),
  });

  // ---------------- Rows ----------------
  const scvRows = useMemo(() => {
    const items: VoteSubmissionContestDto[] = scvQ.data ?? [];
    if (!items.length) return [["No contest votes.", "", "", "", "", "", ""]];

    return items.map((r) => [
      r.submissionId ?? "",
      r.contestName ?? "—",
      r.optionLabel ?? r.optionId ?? "—",
      String(r.voteValue ?? 0),
      r.rank != null ? String(r.rank) : "—",
      r.dateCreated ? new Date(r.dateCreated).toLocaleString() : "—",
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            setEditingScv(r);
            setEditVoteValue(r.voteValue ?? 0);
            setEditRank(r.rank ?? "");
          }}
          disabled={!canEdit}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canEdit) return;
            const ok = window.confirm(
              `Delete normalized row ${r.scvId}? This is permanent.`
            );
            if (!ok) return;
            deleteScvM.mutate(r.scvId);
          }}
          disabled={!canEdit || deleteScvM.isPending}
        >
          Delete
        </button>
      </div>,
    ]);
  }, [scvQ.data, canEdit, deleteScvM.isPending]);

  const rankingRows = useMemo(() => {
    const items = rankingsQ.data ?? [];
    if (!items.length) return [["No rankings.", "", "", "", ""]];

    return items.map((r: VoteSubmissionRankingDto) => [
      r.submissionId ?? "",
      r.contestName ?? r.contestId ?? "—",
      JSON.stringify(r.ranking ?? []),
      r.dateCreated ? new Date(r.dateCreated).toLocaleString() : "—",
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={() => {
            setEditingRanking({
              svrId: r.svrId,
              submissionId: r.submissionId,
              contestId: r.contestId,
              ranking: r.ranking,
            });
            setEditingRankingJson(JSON.stringify(r.ranking ?? [], null, 2));
            setAddRankingOpen(true);
          }}
          disabled={!canEdit}
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            if (!canEdit) return;
            const ok = window.confirm(
              `Delete ranking ${r.svrId}? This is permanent.`
            );
            if (!ok) return;
            deleteRankM.mutate(r.svrId as string);
          }}
          disabled={!canEdit || deleteRankM.isPending}
        >
          Delete
        </button>
      </div>,
    ]);
  }, [rankingsQ.data, canEdit, deleteRankM.isPending]);

  // ---------------- Actions ----------------
  function runNormalizeSubmission() {
    if (!submissionId) return alert("submissionId is required");
    normalizeM.mutate(submissionId);
  }

  function runBackfill() {
    if (!electionId) return alert("electionId required");
    backfillM.mutate(electionId);
  }

  function runReplaceContestVotes() {
    if (!submissionId || !electionId || !contestId) {
      return alert(
        "submissionId, electionId and contestId are required for bulk replace"
      );
    }
    if (!requireOrgForWrite("Replace contest votes")) return;

    try {
      const items = JSON.parse(bulkJson);
      const payload: VoteSubmissionContestBulkRequest = {
        submissionId,
        orgId: resolvedOrgId,
        electionId,
        contestId,
        items,
      };
      replaceM.mutate(payload);
    } catch {
      alert("Invalid JSON in bulk items");
    }
  }

  function runCreateScv() {
    if (!submissionId || !electionId || !contestId) {
      return alert("submissionId, electionId and contestId are required");
    }
    if (!requireOrgForWrite("Create Contest Vote Row")) return;
    if (!newOptionId) return alert("optionId required");

    const req: VoteSubmissionContestCreateRequest = {
      submissionId,
      orgId: resolvedOrgId,
      electionId,
      contestId,
      optionId: newOptionId,
      voteValue: newVoteValue === "" ? 0 : Number(newVoteValue),
      rank: newRank === "" ? null : (newRank as number | null),
    };

    createScvM.mutate(req, { onSuccess: () => setAddScvOpen(false) });
  }

  function runUpdateScv() {
    if (!editingScv) return;

    const req: VoteSubmissionContestUpdateRequest = {
      voteValue: editVoteValue === "" ? undefined : Number(editVoteValue),
      rank: editRank === "" ? null : (editRank as number),
    };

    updateScvM.mutate({ id: editingScv.scvId, req });
    setEditingScv(null);
  }

  function runCreateOrUpdateRanking(
    subId?: string,
    conId?: string,
    json?: string
  ) {
    const sid = subId ?? submissionId;
    const cid = conId ?? contestId;
    const payloadJson =
      json ?? (editingRanking ? editingRankingJson : rankingJson);

    if (!sid || !cid) return alert("submissionId and contestId required");
    if (!requireOrgForRanking("Create/Update Ranking")) return;

    try {
      const arr = JSON.parse(payloadJson);
      if (!Array.isArray(arr)) return alert("Ranking JSON must be an array");

      const dto: VoteSubmissionRankingDto = {
        svrId: editingRanking?.svrId ?? null,
        submissionId: sid,
        contestId: cid,
        ranking: arr,
      };

      rankM.mutate(dto, { onSuccess: () => setAddRankingOpen(false) });
    } catch {
      alert("Invalid ranking JSON (must be array)");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Panel
        title="Submission Normalization"
        right={
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <Badge text={canEdit ? "NEC/SYSTEM" : "Read-only"} />
            {dashboardMode === "SYSTEM" ? (
              <Badge
                text={resolvedOrgId ? "Org selected" : "No org selected"}
              />
            ) : null}
          </div>
        }
      >
        <div style={{ display: "grid", gap: 8 }}>
          {/* inputs */}
          <div
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <input
              placeholder="submissionId"
              value={submissionId}
              onChange={(e) => setSubmissionId(e.target.value)}
              style={{ padding: 6, minWidth: 320 }}
            />

            <input
              placeholder={
                orgRequired ? "orgId (required)" : "orgId (optional for SYSTEM)"
              }
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              style={{ padding: 6, minWidth: 320 }}
              disabled={dashboardMode !== "SYSTEM"}
            />

            <input
              placeholder="electionId"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              style={{ padding: 6, minWidth: 320 }}
            />

            <input
              placeholder="contestId (optional for listing)"
              value={contestId}
              onChange={(e) => setContestId(e.target.value)}
              style={{ padding: 6, minWidth: 320 }}
            />

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => scvQ.refetch()}
                disabled={!submissionId}
              >
                Refresh SCV
              </button>
              <button
                type="button"
                onClick={() => rankingsQ.refetch()}
                disabled={!submissionId}
              >
                Refresh Rankings
              </button>
            </div>
          </div>

          {dashboardMode === "SYSTEM" && !resolvedOrgId ? (
            <div
              style={{
                padding: 10,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                background: "#fff",
              }}
            >
              <div style={{ fontWeight: 900 }}>SYSTEM mode</div>
              <div style={{ color: "#6b7280", fontSize: 13, lineHeight: 1.35 }}>
                Some actions require <strong>orgId</strong>. Select an org in
                the org dropdown to enable create/replace and ranking writes.
              </div>
            </div>
          ) : null}

          {/* actions */}
          {canEdit ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={runNormalizeSubmission}
                  disabled={normalizeM.isPending || !submissionId}
                >
                  Normalize Submission
                </button>

                <button
                  type="button"
                  onClick={runBackfill}
                  disabled={backfillM.isPending || !electionId}
                >
                  Backfill Verified (Election)
                </button>

                {/* ✅ Create buttons */}
                <button
                  type="button"
                  onClick={() => setAddScvOpen(true)}
                  disabled={!submissionId || !contestId || !electionId}
                >
                  + Create Contest Vote Row
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAddRankingOpen(true);
                    setEditingRanking(null);
                    setEditingRankingJson(rankingJson);
                    setNewRankingJson(rankingJson);
                  }}
                  disabled={!submissionId || !contestId}
                >
                  + Create Ranking
                </button>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>
                  Bulk replace contest votes
                </div>
                <textarea
                  rows={6}
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  style={{ width: "100%", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={runReplaceContestVotes}
                  disabled={
                    replaceM.isPending ||
                    !submissionId ||
                    !contestId ||
                    !electionId
                  }
                >
                  Replace contest votes
                </button>
              </div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontWeight: 900 }}>Ranking JSON</div>
                <textarea
                  rows={3}
                  value={rankingJson}
                  onChange={(e) => setRankingJson(e.target.value)}
                  style={{ width: "100%", fontFamily: "monospace" }}
                />
                <button
                  type="button"
                  onClick={() => runCreateOrUpdateRanking()}
                  disabled={rankM.isPending || !submissionId || !contestId}
                >
                  Create/Update Ranking
                </button>
              </div>
            </div>
          ) : (
            <div style={{ color: "#6b7280", fontWeight: 700 }}>
              Read-only: normalization actions are restricted to NEC/SYSTEM.
            </div>
          )}

          {/* tables */}
          <div style={{ height: 8 }} />

          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Contest Votes (vote_submission_contest)
            </div>
            <SimpleTable
              columns={[
                "Submission",
                "Contest",
                "Option",
                "Votes",
                "Rank",
                "Created",
                "Actions",
              ]}
              rows={scvRows as any}
            />
          </div>

          <div>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>
              Rankings (vote_submission_ranking)
            </div>
            <SimpleTable
              columns={[
                "Submission",
                "Contest",
                "Ranking (JSON)",
                "Created",
                "Actions",
              ]}
              rows={rankingRows as any}
            />
          </div>

          <div style={{ marginTop: 12 }}>
            <PlaceholderNote
              title="Notes"
              bullets={[
                "SYSTEM + NEC can run normalization/backfill actions (backend enforces).",
                "Tenant and NEC require org context for write actions (frontend enforces).",
              ]}
            />
          </div>
        </div>
      </Panel>

      {/* ---------------- Edit SCV Modal ---------------- */}
      {editingScv ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => setEditingScv(null)}
        >
          <div
            className="w-full max-w-[520px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>Edit Contest Vote Row</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  scvId: {editingScv.scvId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingScv(null)}
                disabled={updateScvM.isPending}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div>
                <label className="text-sm font-bold">Vote Value</label>
                <input
                  type="number"
                  min={0}
                  value={String(editVoteValue)}
                  onChange={(e) =>
                    setEditVoteValue(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Rank (optional)</label>
                <input
                  type="number"
                  min={1}
                  value={editRank === null ? "" : String(editRank)}
                  onChange={(e) =>
                    setEditRank(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button
                  type="button"
                  onClick={() => setEditingScv(null)}
                  disabled={updateScvM.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runUpdateScv}
                  disabled={updateScvM.isPending}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Create SCV Modal ---------------- */}
      {addScvOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => setAddScvOpen(false)}
        >
          <div
            className="w-full max-w-[520px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>Create Contest Vote Row</div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  submission: {submissionId || "—"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddScvOpen(false)}
                disabled={createScvM.isPending}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div>
                <label className="text-sm font-bold">Option ID</label>
                <input
                  type="text"
                  value={newOptionId}
                  onChange={(e) => setNewOptionId(e.target.value)}
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Vote Value</label>
                <input
                  type="number"
                  min={0}
                  value={String(newVoteValue)}
                  onChange={(e) =>
                    setNewVoteValue(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Rank (optional)</label>
                <input
                  type="number"
                  min={1}
                  value={newRank === null ? "" : String(newRank)}
                  onChange={(e) =>
                    setNewRank(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button
                  type="button"
                  onClick={() => setAddScvOpen(false)}
                  disabled={createScvM.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runCreateScv}
                  disabled={createScvM.isPending}
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Create/Edit Ranking Modal ---------------- */}
      {addRankingOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => {
            setAddRankingOpen(false);
            setEditingRanking(null);
          }}
        >
          <div
            className="w-full max-w-[720px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 900 }}>
                  {editingRanking ? "Edit Ranking" : "Create Ranking"}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  submission: {editingRanking?.submissionId ?? submissionId}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddRankingOpen(false);
                  setEditingRanking(null);
                }}
                disabled={rankM.isPending}
              >
                Close
              </button>
            </div>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div>
                <label className="text-sm font-bold">Submission ID</label>
                <input
                  type="text"
                  value={editingRanking?.submissionId ?? submissionId}
                  onChange={(e) => {
                    const sid = e.target.value;
                    setEditingRanking((s: any) => ({
                      ...(s ?? {}),
                      submissionId: sid,
                    }));
                  }}
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div>
                <label className="text-sm font-bold">Contest ID</label>
                <input
                  type="text"
                  value={editingRanking?.contestId ?? contestId}
                  onChange={(e) => {
                    const cid = e.target.value;
                    setEditingRanking((s: any) => ({
                      ...(s ?? {}),
                      contestId: cid,
                    }));
                  }}
                  className="px-3 py-2 rounded border w-full"
                />
              </div>

              <div>
                <label className="text-sm font-bold">
                  Ranking JSON (array)
                </label>
                <textarea
                  rows={6}
                  value={editingRanking ? editingRankingJson : newRankingJson}
                  onChange={(e) =>
                    editingRanking
                      ? setEditingRankingJson(e.target.value)
                      : setNewRankingJson(e.target.value)
                  }
                  style={{ width: "100%", fontFamily: "monospace" }}
                />
              </div>

              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAddRankingOpen(false);
                    setEditingRanking(null);
                  }}
                  disabled={rankM.isPending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (editingRanking) {
                      runCreateOrUpdateRanking(
                        editingRanking.submissionId,
                        editingRanking.contestId,
                        editingRankingJson
                      );
                    } else {
                      runCreateOrUpdateRanking(
                        submissionId,
                        contestId,
                        newRankingJson
                      );
                    }
                  }}
                  disabled={rankM.isPending}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
