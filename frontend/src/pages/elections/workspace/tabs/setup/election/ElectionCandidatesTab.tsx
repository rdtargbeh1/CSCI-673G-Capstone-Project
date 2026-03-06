
// src/pages/elections/workspace/tabs/setup/election/ElectionCandidatesTab.tsx

import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";
import {
  ReadOnlyBanner,
  PlaceholderNote,
  Badge,
} from "../../../../shared/elections-ui";

import {
  fetchElectionCandidates,
  createElectionCandidate,
  updateElectionCandidate,
  deleteElectionCandidate,
  type ElectionCandidateDto,
} from "../../../../../../shared/services/electionCandidateService";

import {
  searchCandidates,
  type CandidateDto,
} from "../../../../../../shared/services/candidateService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}
function fmtDate(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return safeStr(v);
  return d.toLocaleString();
}
function friendlySaveError(err: any): string {
  const msg =
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save.";
  return msg;
}

/** Compact table (reduced row padding) */
function CompactTable(props: {
  columns: string[];
  rows: React.ReactNode[][];
  onRowClick?: (index: number) => void;
  selectedRowIndex?: number;
}) {
  const { columns, rows, onRowClick, selectedRowIndex } = props;
  return (
    <div className="w-full overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-base">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-1.5 text-base font-extrabold text-slate-600 border-b border-slate-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              onClick={onRowClick ? () => onRowClick(idx) : undefined}
              className={`border-b border-slate-100 last:border-b-0 ${
                onRowClick ? "cursor-pointer hover:bg-slate-50" : ""
              } ${selectedRowIndex === idx ? "bg-slate-50" : ""}`}
            >
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 align-top text-slate-800">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ElectionCandidatesTab() {
  const qc = useQueryClient();
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // filters
  const [q, setQ] = useState("");

  // selection
  const [selected, setSelected] = useState<ElectionCandidateDto | null>(null);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ElectionCandidateDto | null>(null);
  const [touched, setTouched] = useState(false);

  // fields
  const [candidateId, setCandidateId] = useState(""); // create only
  const [centerId, setCenterId] = useState(""); // create/update
  const [centerNullable, setCenterNullable] = useState(true); // if true => send null

  const candidatesQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: ["election-candidates", electionId],
    queryFn: () => fetchElectionCandidates(electionId!),
    staleTime: 10_000,
    retry: 1,
  });

  const all = useMemo(() => candidatesQ.data ?? [], [candidatesQ.data]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return all;
    return all.filter((x) => {
      const name = safeStr(x.fullName).toLowerCase();
      const party = safeStr(x.partyAbbrev).toLowerCase();
      const center = safeStr(x.centerName).toLowerCase();
      const cid = safeStr(x.candidateId).toLowerCase();
      const eid = safeStr(x.electId).toLowerCase();
      return (
        name.includes(term) ||
        party.includes(term) ||
        center.includes(term) ||
        cid.includes(term) ||
        eid.includes(term)
      );
    });
  }, [all, q]);

  React.useEffect(() => {
    if (!selected) return;
    const still = all.find((x) => x.electId === selected.electId);
    setSelected(still ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);

  const refreshNow = async () => {
    if (!electionId) return;
    await qc.invalidateQueries({
      queryKey: ["election-candidates", electionId],
    });
    await candidatesQ.refetch();
  };

  const openCreate = () => {
    if (!electionId) return;
    setEditing(null);
    setCandidateId("");
    setCenterId("");
    setCenterNullable(true);
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (row: ElectionCandidateDto) => {
    setEditing(row);
    setCandidateId(""); // unused in edit
    setCenterId(safeStr(row.centerId ?? ""));
    setCenterNullable(row.centerId == null);
    setTouched(false);
    setOpen(true);
  };

  const createM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId.");
      const cId = candidateId.trim();
      if (!cId) throw new Error("candidateId is required.");

      return createElectionCandidate({
        electionId,
        candidateId: cId,
        centerId: centerNullable ? null : centerId.trim() || null,
      });
    },
    onSuccess: async (created) => {
      setOpen(false);
      setEditing(null);
      await refreshNow();
      setSelected(created);
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No row selected.");
      return updateElectionCandidate(editing.electId, {
        centerId: centerNullable ? null : centerId.trim() || null,
      });
    },
    onSuccess: async (updated) => {
      setOpen(false);
      setEditing(null);
      await refreshNow();
      setSelected(updated);
    },
  });

  const deleteM = useMutation({
    mutationFn: async (electId: string) => deleteElectionCandidate(electId),
    onSuccess: async () => {
      setSelected(null);
      await refreshNow();
    },
  });

  const saving = createM.isPending || updateM.isPending;

  const selectedRowIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex((x) => x.electId === selected.electId);
  }, [filtered, selected]);

  // Candidates master list (fetched when create modal opens)
  const candidatesMasterQ = useQuery({
    enabled: open && !editing, // only load for create form when modal open
    queryKey: ["candidates", "master"],
    queryFn: async () => {
      const page = await searchCandidates({
        page: 0,
        size: 500,
      });
      return page.items as CandidateDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  const rows = useMemo(() => {
    return filtered.map((r) => {
      const actions = (
        <div
          className="flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Edit btn */}
          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-700 ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit (SYSTEM/NEC)" : "Read-only"}
            onClick={() => openEdit(r)}
          >
            <Pencil size={20} />
          </button>

          <button
            type="button"
            disabled={!canEdit || deleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 ${
              !canEdit || deleteM.isPending ? "opacity-60" : ""
            }`}
            title={canEdit ? "Delete (SYSTEM/NEC)" : "Read-only"}
            onClick={() => {
              const ok = window.confirm(
                `Remove candidate "${r.fullName}" from this election?\nThis is permanent.`
              );
              if (ok) deleteM.mutate(r.electId);
            }}
          >
            <Trash2 size={20} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <div key={r.electId} className="grid">
          <span className="font-bold">{r.fullName}</span>
        </div>,
        <span key="party" className="text-slate-700">
          {r.partyAbbrev ?? "—"}
        </span>,
        <div key="center" className="grid">
          <span className="text-slate-700">{r.centerName ?? "NATIONAL"}</span>
        </div>,
        <span key="created" className="text-base text-slate-600">
          {fmtDate(r.dateCreated)}
        </span>,
        <span key="updated" className="text-base text-slate-600">
          {fmtDate(r.dateUpdated)}
        </span>,
        actions,
      ];
    });
  }, [filtered, canEdit, deleteM.isPending]);

  if (!electionId) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 bg-white">
        <div className="font-extrabold text-slate-800">Election Candidates</div>
        <div className="text-base text-slate-600 mt-1">
          Missing <b>electionId</b> in route params.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Election setup is managed by NEC/System Admin. You can view candidates read-only."
          sources={["election_candidate", "candidate", "polling_center"]}
        />
      ) : null}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidates…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[280px] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setQ("")}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-blue-700 text-white font-bold"
            >
              <Plus size={16} />
              Assign Candidate
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={candidatesQ.isFetching}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-blue-100 ${
              candidatesQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {candidatesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading election candidates…</div>
      ) : candidatesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(candidatesQ.error as any)?.message ?? "Failed to load candidates."}
        </div>
      ) : null}

      <CompactTable
        columns={[
          "Candidate",
          "Party",
          "Center",
          "Created",
          "Updated",
          "Actions",
        ]}
        rows={
          rows.length
            ? rows
            : [
                [
                  <span key="empty" className="text-slate-500">
                    No candidates assigned yet.
                  </span>,
                  "",
                  "",
                  "",
                  "",
                  "",
                ],
              ]
        }
        onRowClick={(idx) => setSelected(filtered[idx] ?? null)}
        selectedRowIndex={selectedRowIndex}
      />

      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM/NEC can create/edit/delete election candidates.",
            "Assign uses candidateId (from Candidate Master) + optional centerId.",
            "centerId null means NATIONAL candidate (no center-specific linkage).",
          ]}
        />
      </div>

      {/* ---------------- Modal ---------------- */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => {
            if (saving) return;
            setOpen(false);
          }}
        >
          <div
            className="w-full max-w-[860px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-xl">
                  {editing
                    ? "Edit Election Candidate"
                    : "Assign Candidate to Election"}
                </div>
                <div className="text-sm text-slate-500 mt-0.5 font-bold">
                  {editing
                    ? `electId: ${editing.electId}`
                    : "Select a candidate from Candidate Master and optional centerId."}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  saving ? "opacity-60" : ""
                }`}
              >
                Close
              </button>
            </div>

            <div className="grid gap-2.5 mt-3">
              {!editing ? (
                <div className="grid gap-1.5">
                  <div className="text-lg font-extrabold text-slate-600">
                    Candidate <span className="text-red-600">*</span>
                  </div>

                  {candidatesMasterQ.isLoading ? (
                    <div className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600">
                      Loading candidates…
                    </div>
                  ) : candidatesMasterQ.isError ? (
                    <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
                      {(candidatesMasterQ.error as any)?.message ??
                        "Failed to load candidates."}
                    </div>
                  ) : (
                    <select
                      value={candidateId}
                      onChange={(e) => {
                        setCandidateId(e.target.value);
                        setTouched(true);
                      }}
                      className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                    >
                      <option value="">-- Select candidate --</option>
                      {(candidatesMasterQ.data ?? []).map((c: CandidateDto) => (
                        <option key={c.candidateId} value={c.candidateId}>
                          {c.fullName}
                          {c.abbreviation ? ` — ${c.abbreviation}` : ""}
                        </option>
                      ))}
                    </select>
                  )}

                  {touched && !candidateId.trim() ? (
                    <div className="text-sm font-bold text-red-600">
                      Required
                    </div>
                  ) : null}
                  <div className="text-sm text-slate-500 font-bold">
                    Select candidate from Candidate Master.
                  </div>
                </div>
              ) : null}

              <div className="grid gap-1.5">
                <div className="text-base font-extrabold text-slate-600">
                  Polling Center
                </div>

                <label className="inline-flex items-center gap-2 text-base text-slate-700">
                  <input
                    type="checkbox"
                    checked={centerNullable}
                    onChange={(e) => setCenterNullable(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  NATIONAL (no center)
                </label>

                <input
                  value={centerId}
                  onChange={(e) => {
                    setCenterId(e.target.value);
                    setTouched(true);
                  }}
                  disabled={centerNullable}
                  placeholder="centerId UUID (optional)"
                  className={`px-3 py-2.5 rounded-lg border border-slate-200 outline-none ${
                    centerNullable ? "opacity-60" : ""
                  }`}
                />

                <div className="text-base text-slate-500 text-blue font-bold">
                  If <span className="text-red-800 font-extrabold">NATIONAL</span> is checked, centerId will be saved as <b>null</b>.
                </div>
              </div>

              {createM.isError || updateM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {createM.isError
                    ? friendlySaveError(createM.error)
                    : friendlySaveError(updateM.error)}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    saving ? "opacity-60" : ""
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canEdit || saving}
                  onClick={() => {
                    setTouched(true);
                    if (!canEdit) return;

                    if (editing) updateM.mutate();
                    else createM.mutate();
                  }}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || saving ? "opacity-60" : ""
                  }`}
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
