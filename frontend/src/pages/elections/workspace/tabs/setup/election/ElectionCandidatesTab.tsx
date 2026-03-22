
 // src/pages/elections/workspace/tabs/setup/election/ElectionCandidatesTab.tsx

import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";

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

/** ============ HELPERS ============ */
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

/** ============ MAIN COMPONENT ============ */
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
  const [candidateId, setCandidateId] = useState("");
  const [centerId, setCenterId] = useState("");
  const [centerNullable, setCenterNullable] = useState(true);

  /** ============ QUERIES ============ */
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

  /** ============ HANDLERS (BEFORE MUTATIONS) ============ */
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
    setCandidateId("");
    setCenterId(safeStr(row.centerId ?? ""));
    setCenterNullable(row.centerId == null);
    setTouched(false);
    setOpen(true);
  };

  /** ============ MUTATIONS ============ */
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

  /** ============ STATE ============ */
  const saving = createM.isPending || updateM.isPending;

  const selectedRowIndex = useMemo(() => {
    if (!selected) return -1;
    return filtered.findIndex((x) => x.electId === selected.electId);
  }, [filtered, selected]);

  // Candidates master list (fetched when create modal opens)
  const candidatesMasterQ = useQuery({
    enabled: open && !editing,
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

  /** ============ TABLE ROWS ============ */
  const rows = useMemo(() => {
    return filtered.map((r) => {
      const actions = (
        <div
          className="flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-700 hover:bg-green-50 transition ${
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
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 hover:bg-red-50 transition ${
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

  /** ============ RENDER ============ */
  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Election setup is managed by NEC/System Admin. You can view candidates read-only."
          sources={["election_candidate", "candidate", "polling_center"]}
        />
      ) : null}

      {/* ============ HEADER ACTIONS ============ */}
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
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[280px] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setQ("")}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={16} className="text-red-500" />
              Assign Candidate
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={candidatesQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              candidatesQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============ STATUS ============ */}
      {candidatesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading election candidates…</div>
      ) : candidatesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(candidatesQ.error as any)?.message ?? "Failed to load candidates."}
        </div>
      ) : null}

      {/* ============ TABLE ============ */}
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

      {/* ============ NOTES ============ */}
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

      {/* ============ CREATE/EDIT MODAL (ENHANCED UX) ============ */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (saving) return;
            setOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ============ HEADER WITH BLUE GRADIENT ============ */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  {editing ? (
                    <>
                      <Pencil size={28} className="text-white" />
                      Edit Candidate
                    </>
                  ) : (
                    <>
                      <Plus size={28} className="text-red-500" />
                      Assign Candidate
                    </>
                  )}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  {editing
                    ? `Update candidate settings for this election.`
                    : "Add a candidate from Candidate Master to this election."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setOpen(false);
                }}
                disabled={saving}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white disabled:opacity-50"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* ============ CONTENT ============ */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 space-y-5 sm:space-y-6">
              {/* Candidate Selection (Create only) */}
              {!editing ? (
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Candidate <span className="text-red-600">*</span>
                  </label>

                  {candidatesMasterQ.isLoading ? (
                    <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-600 text-base">
                      Loading candidates…
                    </div>
                  ) : candidatesMasterQ.isError ? (
                    <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="text-sm text-red-700 font-semibold">
                        {(candidatesMasterQ.error as any)?.message ??
                          "Failed to load candidates."}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={candidateId}
                      onChange={(e) => {
                        setCandidateId(e.target.value);
                        setTouched(true);
                      }}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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

                  {touched && !candidateId.trim() && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600 font-semibold">
                      <AlertCircle size={16} />
                      Candidate is required
                    </div>
                  )}
                  {touched && candidateId.trim() && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-600 font-semibold">
                      <CheckCircle size={16} />
                      Valid candidate selected
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 sm:p-4">
                  <p className="text-lg text-blue-800">
                    <strong className="font-bold">📌 Editing Candidate:</strong> {editing.fullName}
                  </p>
                </div>
              )}

              {/* Polling Center Field */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">
                  Polling Center
                </label>

                {/* NATIONAL Checkbox */}
                <div className="mb-4">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={centerNullable}
                      onChange={(e) => setCenterNullable(e.target.checked)}
                      className="h-5 w-5 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-base font-semibold text-slate-900">
                      NATIONAL (no center)
                    </span>
                    <span className="text-sm text-slate-500 ml-auto">
                      Center-independent candidate
                    </span>
                  </label>
                </div>

                {/* Center ID Input */}
                <input
                  value={centerId}
                  onChange={(e) => {
                    setCenterId(e.target.value);
                    setTouched(true);
                  }}
                  disabled={centerNullable}
                  placeholder="centerId UUID (optional)"
                  className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                    centerNullable ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                />

                {centerNullable && (
                  <p className="text-xs sm:text-sm text-amber-600 font-semibold mt-2">
                    📌 Center ID is disabled for NATIONAL candidates
                  </p>
                )}
              </div>

              {/* Error Message */}
              {(createM.isError || updateM.isError) && (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-red-700 font-semibold">
                    {createM.isError
                      ? friendlySaveError(createM.error)
                      : friendlySaveError(updateM.error)}
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 sm:p-4">
                <p className="text-sm text-blue-800">
                  <strong className="font-bold">💡 Tip:</strong> Check "NATIONAL" for candidates not tied to a specific polling center. Otherwise, provide center UUID.
                </p>
              </div>
            </div>

            {/* ============ FOOTER ============ */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (saving) return;
                  setOpen(false);
                }}
                disabled={saving}
                className="px-4 sm:px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canEdit || saving || (!editing && !candidateId.trim())}
                onClick={() => {
                  setTouched(true);
                  if (!canEdit) return;
                  if (editing) updateM.mutate();
                  else createM.mutate();
                }}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-bold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || saving || (!editing && !candidateId.trim())
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
                title={
                  !canEdit
                    ? "Read-only (Tenant)"
                    : !candidateId.trim() && !editing
                    ? "Select a candidate"
                    : "Save candidate"
                }
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-red-500" />
                    <span className="hidden sm:inline">
                      {editing ? "Update Candidate" : "Assign Candidate"}
                    </span>
                    <span className="sm:hidden">{editing ? "Update" : "Assign"}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

