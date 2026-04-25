
// src/pages/elections/workspace/tabs/setup/election/ElectionPartiesTab.tsx

import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";
import {
  ReadOnlyBanner,
  PlaceholderNote,
  Badge,
} from "../../../../shared/elections-ui";

import {
  fetchElectionParties,
  addPartyToElection,
  updateElectionParty,
  deleteElectionParty,
  type ElectionPartyDto,
} from "../../../../../../shared/services/electionPartyService";

import {
  searchParties,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

/** ============ HELPERS ============ */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function friendlySaveError(err: any): string {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save."
  );
}

/** Compact table */
function CompactTable(props: { columns: string[]; rows: React.ReactNode[][] }) {
  const { columns, rows } = props;
  return (
    <div className="w-full overflow-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-lg">
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
            <tr key={idx} className="border-b border-slate-100 last:border-b-0 text-sm">
              {r.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 align-top text-slate-800 text-base">
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
export default function ElectionPartiesTab() {
  const qc = useQueryClient();
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystemAdmin = useAuthStore((s) => s.isSystemAdmin());

  // ✅ SYSTEM + NEC can CRUD (no role-string comparisons)
  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ElectionPartyDto | null>(null);

  // fields
  const [selectedPartyId, setSelectedPartyId] = useState("");
  const [ballotOrder, setBallotOrder] = useState<number | "">("");
  const [isQualified, setIsQualified] = useState<boolean>(true);

  /** ============ QUERIES ============ */
  const partiesQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: ["election-parties", electionId],
    queryFn: () => fetchElectionParties(electionId!),
    staleTime: 10_000,
    retry: 1,
  });

  const partyMasterQ = useQuery({
    enabled: open && !editing,
    queryKey: ["parties", "master"],
    queryFn: async () => {
      const page = await searchParties({ page: 0, size: 500 });
      return page.items as PartyDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });

  /** ============ HANDLERS (BEFORE MUTATIONS) ============ */
  const refreshNow = async () => {
    if (!electionId) return;
    await qc.invalidateQueries({ queryKey: ["election-parties", electionId] });
    await partiesQ.refetch();
  };

  const openCreate = () => {
    if (!electionId) return;
    setEditing(null);
    setSelectedPartyId("");
    setBallotOrder("");
    setIsQualified(true);
    setOpen(true);
  };

  const openEdit = (row: ElectionPartyDto) => {
    setEditing(row);
    setSelectedPartyId(row.partyId);
    setBallotOrder(row.ballotOrder ?? "");
    setIsQualified(Boolean(row.isQualified));
    setOpen(true);
  };

  /** ============ MUTATIONS ============ */
  const addM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId.");
      if (!selectedPartyId.trim()) throw new Error("Party is required.");

      return addPartyToElection(electionId, {
        electionId,
        partyId: selectedPartyId,
        ballotOrder: ballotOrder === "" ? undefined : Number(ballotOrder),
        isQualified,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!electionId || !editing) throw new Error("Missing context.");

      return updateElectionParty(electionId, editing.partyId, {
        ballotOrder: ballotOrder === "" ? null : Number(ballotOrder),
        isQualified,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (partyId: string) => {
      if (!electionId) throw new Error("Missing electionId.");
      return deleteElectionParty(electionId, partyId);
    },
    onSuccess: refreshNow,
  });

  const toggleQualifiedM = useMutation({
    mutationFn: async (payload: {
      partyId: string;
      nextQualified: boolean;
    }) => {
      if (!electionId) throw new Error("Missing electionId.");
      return updateElectionParty(electionId, payload.partyId, {
        isQualified: payload.nextQualified,
      });
    },
    onSuccess: refreshNow,
  });

  /** ============ STATE ============ */
  const saving = addM.isPending || updateM.isPending;

  /** ============ TABLE ROWS ============ */
  const rows = useMemo(() => {
    const items = partiesQ.data ?? [];

    if (!items.length) {
      return [
        [
          <span key="empty" className="text-slate-500">
            No parties assigned yet.
          </span>,
          "",
          "",
          "",
        ],
      ];
    }

    return items.map((p) => {
      const toggleBtn = (
        <button
          type="button"
          onClick={() => {
            if (!canEdit) return;
            toggleQualifiedM.mutate({
              partyId: p.partyId,
              nextQualified: !p.isQualified,
            });
          }}
          disabled={!canEdit || toggleQualifiedM.isPending}
          title={canEdit ? "Toggle qualified" : "Read-only"}
          className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
            !canEdit || toggleQualifiedM.isPending ? "opacity-60" : ""
          }`}
        >
          {p.isQualified ? (
            <CheckCircle2 size={22} className="text-emerald-600" />
          ) : (
            <XCircle size={18} className="text-slate-400" />
          )}
        </button>
      );

      const actions = (
        <div className="flex flex-wrap gap-2">
          {toggleBtn}

          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 transition ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit (SYSTEM/NEC)" : "Read-only"}
            onClick={() => openEdit(p)}
          >
            <Pencil size={22} />
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
                `Remove party "${safeStr(
                  p.partyName
                )}" from this election?\nThis is permanent.`
              );
              if (ok) deleteM.mutate(p.partyId);
            }}
          >
            <Trash2 size={22} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <span key="party" className="font-bold">
          {p.partyName ?? "—"}
        </span>,
        <span
          key="qual"
          className={`text-base font-bold ${
            p.isQualified ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {p.isQualified ? "✅ QUALIFIED" : "⚪ NOT QUALIFIED"}
        </span>,
        <span key="order" className="font-semibold">
          {p.ballotOrder ?? "—"}
        </span>,
        actions,
      ];
    });
  }, [partiesQ.data, canEdit, deleteM.isPending, toggleQualifiedM.isPending]);

  if (!electionId) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 bg-white">
        <div className="font-extrabold text-slate-800">Election Parties</div>
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
          reason="Election setup is managed by NEC/System Admin. You can view parties read-only."
          sources={["election_party", "party"]}
        />
      ) : null}

      {/* ============ HEADER ACTIONS ============ */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div />

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
            >
              <Plus size={18} />
              Assign Party
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={partiesQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              partiesQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============ STATUS ============ */}
      {partiesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading election parties…</div>
      ) : partiesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(partiesQ.error as any)?.message ?? "Failed to load parties."}
        </div>
      ) : null}

      {/* ============ TABLE ============ */}
      <CompactTable
        columns={["Party", "Qualification", "Ballot Order", "Actions"]}
        rows={rows}
      />

      {/* ============ NOTES ============ */}
      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM + NEC can create/edit/delete election parties.",
            "Qualification comes from DB and can be toggled via the icon button.",
            "Modal uses radio buttons and reflects DB value during Edit.",
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
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {editing ? "✏️ Edit Party" : "➕ Assign Party"}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  {editing
                    ? `Update party settings for this election.`
                    : "Add a party from Party Master to this election."}
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
              {/* Party Selection (Create only) */}
              {!editing ? (
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Party <span className="text-red-600">*</span>
                  </label>

                  {partyMasterQ.isLoading ? (
                    <div className="px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-slate-50 text-slate-600 text-base">
                      Loading parties…
                    </div>
                  ) : partyMasterQ.isError ? (
                    <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                      <div className="text-sm text-red-700 font-semibold">
                        {(partyMasterQ.error as any)?.message ??
                          "Failed to load parties."}
                      </div>
                    </div>
                  ) : (
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    >
                      <option value="">-- Select party --</option>
                      {(partyMasterQ.data ?? []).map((p: PartyDto) => (
                        <option key={p.partyId} value={p.partyId}>
                          {p.partyName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 sm:p-4">
                  <p className="text-sm text-blue-800">
                    <strong className="font-bold">📌 Editing Party:</strong> {editing.partyName}
                  </p>
                </div>
              )}

              {/* Ballot Order Field */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                  Ballot Order <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  value={ballotOrder}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") setBallotOrder("");
                    else {
                      const n = Number(v);
                      if (Number.isNaN(n)) return;
                      setBallotOrder(n);
                    }
                  }}
                  type="number"
                  placeholder="e.g., 1, 2, 3..."
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <p className="text-xs sm:text-sm text-slate-500 mt-2">
                  Numeric order for ballot display (optional)
                </p>
              </div>

              {/* Qualification Radio Buttons */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-slate-900 mb-3 sm:mb-4">
                  Qualification <span className="text-red-600">*</span>
                </label>

                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="radio"
                      name="qualified"
                      checked={isQualified === true}
                      onChange={() => setIsQualified(true)}
                      className="h-5 w-5 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-base font-semibold text-slate-900">
                      ✅ Qualified
                    </span>
                    <span className="text-sm text-slate-500 ml-auto">
                      Party is eligible
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="radio"
                      name="qualified"
                      checked={isQualified === false}
                      onChange={() => setIsQualified(false)}
                      className="h-5 w-5 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-base font-semibold text-slate-900">
                      ⚪ Not Qualified
                    </span>
                    <span className="text-sm text-slate-500 ml-auto">
                      Party is ineligible
                    </span>
                  </label>
                </div>
              </div>

              {/* Error Message */}
              {(addM.isError || updateM.isError) && (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-red-700 font-semibold">
                    {addM.isError
                      ? friendlySaveError(addM.error)
                      : friendlySaveError(updateM.error)}
                  </div>
                </div>
              )}

              {/* Help Text */}
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 sm:p-4">
                <p className="text-sm text-blue-800">
                  <strong className="font-bold">💡 Tip:</strong> Use ballot order to arrange parties on the election ballot. Qualified status determines eligibility.
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
                disabled={!canEdit || saving || !selectedPartyId}
                onClick={() => {
                  if (!canEdit) return;
                  if (editing) updateM.mutate();
                  else addM.mutate();
                }}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || saving || (!editing && !selectedPartyId)
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
                title={
                  !canEdit
                    ? "Read-only (Tenant)"
                    : !selectedPartyId && !editing
                    ? "Select a party"
                    : "Save party"
                }
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span className="hidden sm:inline">
                      {editing ? "Update Party" : "Assign Party"}
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

