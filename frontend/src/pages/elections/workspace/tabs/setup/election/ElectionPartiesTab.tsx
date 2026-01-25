
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

/** ---------------- helpers ---------------- */
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
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-slate-50">
            {columns.map((c) => (
              <th
                key={c}
                className="text-left px-3 py-1.5 text-[11px] font-extrabold text-slate-600 border-b border-slate-200"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, idx) => (
            <tr key={idx} className="border-b border-slate-100 last:border-b-0">
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

export default function ElectionPartiesTab() {
  const qc = useQueryClient();
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const isSystemAdmin = useAuthStore((s) => s.isSystemAdmin()); // ✅ use helper

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
    setIsQualified(Boolean(row.isQualified)); // ✅ fetched from DB
    setOpen(true);
  };

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

  // ✅ icon toggle using existing PUT update endpoint
  const toggleQualifiedM = useMutation({
    mutationFn: async (payload: {
      partyId: string;
      nextQualified: boolean;
    }) => {
      if (!electionId) throw new Error("Missing electionId.");
      return updateElectionParty(electionId, payload.partyId, {
        isQualified: payload.nextQualified,
        // ballotOrder omitted -> backend will not change it (your update logic checks null)
      });
    },
    onSuccess: refreshNow,
  });

  const saving = addM.isPending || updateM.isPending;

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
          className={`inline-flex items-center px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
            !canEdit || toggleQualifiedM.isPending ? "opacity-60" : ""
          }`}
        >
          {p.isQualified ? (
            <CheckCircle2 size={18} className="text-emerald-600" />
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
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit (SYSTEM/NEC)" : "Read-only"}
            onClick={() => openEdit(p)}
          >
            <Pencil size={16} />
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
                `Remove party "${safeStr(
                  p.partyName
                )}" from this election?\nThis is permanent.`
              );
              if (ok) deleteM.mutate(p.partyId);
            }}
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <span key="party" className="font-bold">
          {p.partyName ?? "—"}
        </span>,
        <span
          key="qual"
          className={`text-xs font-extrabold ${
            p.isQualified ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {p.isQualified ? "QUALIFIED" : "NOT QUALIFIED"}
        </span>,
        <span key="order">{p.ballotOrder ?? "—"}</span>,
        actions,
      ];
    });
  }, [partiesQ.data, canEdit, deleteM.isPending, toggleQualifiedM.isPending]);

  if (!electionId) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 bg-white">
        <div className="font-extrabold text-slate-800">Election Parties</div>
        <div className="text-sm text-slate-600 mt-1">
          Missing <b>electionId</b> in route params.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Election setup is managed by NEC/System Admin. You can view parties read-only."
          sources={["election_party", "party"]}
        />
      ) : null}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div />

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <Plus size={16} />
              Assign Party
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={partiesQ.isFetching}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              partiesQ.isFetching ? "opacity-60" : ""
            }`}
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {partiesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading election parties…</div>
      ) : partiesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(partiesQ.error as any)?.message ?? "Failed to load parties."}
        </div>
      ) : null}

      <CompactTable
        columns={["Party", "Qualification", "Ballot Order", "Actions"]}
        rows={rows}
      />

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
                <div className="font-extrabold text-base">
                  {editing ? "Edit Election Party" : "Assign Party to Election"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {editing
                    ? `partyId: ${editing.partyId}`
                    : "Select party from Party Master and set ballot order / qualification."}
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
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Party <span className="text-red-600">*</span>
                  </div>

                  {partyMasterQ.isLoading ? (
                    <div className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600">
                      Loading parties…
                    </div>
                  ) : partyMasterQ.isError ? (
                    <div className="px-3 py-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
                      {(partyMasterQ.error as any)?.message ??
                        "Failed to load parties."}
                    </div>
                  ) : (
                    <select
                      value={selectedPartyId}
                      onChange={(e) => setSelectedPartyId(e.target.value)}
                      className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
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
              ) : null}

              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Ballot Order
                </div>
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
                  placeholder="Optional numeric ballot order"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                />
              </div>

              {/* ✅ RADIO: checked based on DB value */}
              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Qualification
                </div>

                <div className="flex items-center gap-6 text-sm text-slate-700">
                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="qualified"
                      checked={isQualified === true}
                      onChange={() => setIsQualified(true)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Qualified
                  </label>

                  <label className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="qualified"
                      checked={isQualified === false}
                      onChange={() => setIsQualified(false)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Not Qualified
                  </label>
                </div>
              </div>

              {addM.isError || updateM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {addM.isError
                    ? friendlySaveError(addM.error)
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
                    if (!canEdit) return;
                    if (editing) updateM.mutate();
                    else addM.mutate();
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
