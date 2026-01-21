// src/pages/elections/workspace/tabs/setup/masters/PartiesMasterTab.tsx
/**
 * PARTY MASTER TAB (party)
 *
 * PURPOSE:
 * - Global master list used when assigning election parties
 *
 * Backend:
 * - GET    /api/parties?q=&page=&size=
 * - POST   /api/parties
 * - PUT    /api/parties/{partyId}
 * - DELETE /api/parties/{partyId}
 */

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";

// ✅ use the same auth store used across your app
import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  ReadOnlyBanner,
  PlaceholderNote,
  Badge,
} from "../../../../shared/elections-ui";

import {
  createParty,
  deleteParty,
  searchParties,
  updateParty,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}
function normalizeAbbrev(v: string) {
  return v.trim().replace(/\s+/g, "").toUpperCase();
}
function friendlySaveError(err: any): string {
  const msg =
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save party.";

  const looksDup = /duplicate|unique|already exists|constraint/i.test(msg);
  if (looksDup) {
    return "Party already exists (duplicate name or abbreviation). Please choose a different one.";
  }
  return msg;
}
function fmtDate(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return safeStr(v);
  return d.toLocaleString();
}

/** Compact table (reduced row padding) */
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

export default function PartiesMasterTab() {
  const qc = useQueryClient();

  // ✅ consistent permission source
  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const size = 20;
  const [page, setPage] = useState(0);

  // filters
  const [q, setQ] = useState("");

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PartyDto | null>(null);
  const [touched, setTouched] = useState(false);

  // form fields
  const [partyName, setPartyName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const partiesQ = useQuery({
    queryKey: ["party-master", page, q],
    queryFn: () => searchParties({ page, size, q: q.trim() || undefined }),
    staleTime: 10_000,
    retry: 1,
  });

  const items = useMemo(() => partiesQ.data?.items ?? [], [partiesQ.data]);
  const totalPages = Math.max(1, partiesQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["party-master"] });
    await partiesQ.refetch();
  };

  const openCreate = () => {
    setEditing(null);
    setPartyName("");
    setAbbreviation("");
    setLogoUrl("");
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (p: PartyDto) => {
    setEditing(p);
    setPartyName(safeStr(p.partyName));
    setAbbreviation(safeStr(p.abbreviation));
    setLogoUrl(safeStr(p.logoUrl));
    setTouched(false);
    setOpen(true);
  };

  const createM = useMutation({
    mutationFn: async () => {
      const name = normalizeName(partyName);
      const abbr = normalizeAbbrev(abbreviation);

      if (!name) throw new Error("Party name is required.");
      if (!abbr) throw new Error("Abbreviation is required.");

      return createParty({
        partyName: name,
        abbreviation: abbr,
        logoUrl: logoUrl.trim() || null,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setPartyName("");
      setAbbreviation("");
      setLogoUrl("");
      setTouched(false);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No party selected.");

      const name = normalizeName(partyName);
      const abbr = normalizeAbbrev(abbreviation);

      if (!name) throw new Error("Party name is required.");
      if (!abbr) throw new Error("Abbreviation is required.");

      return updateParty(editing.partyId, {
        partyName: name,
        abbreviation: abbr,
        logoUrl: logoUrl.trim() || null,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setPartyName("");
      setAbbreviation("");
      setLogoUrl("");
      setTouched(false);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (partyId: string) => deleteParty(partyId),
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const rows = useMemo(() => {
    return items.map((p) => {
      const actions = (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit party (SYSTEM/NEC)" : "Read-only (Tenant)"}
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
            title={canEdit ? "Delete party (SYSTEM/NEC)" : "Read-only (Tenant)"}
            onClick={() => {
              const ok = window.confirm(
                `Delete party "${p.partyName}" (${p.abbreviation})?\nThis is permanent.`
              );
              if (ok) deleteM.mutate(p.partyId);
            }}
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <div key={p.partyId} className="grid gap-0.5">
          <div>{p.partyName}</div>
        </div>,
        <span key="abbr" className=" text-slate-700">
          {p.abbreviation}
        </span>,
        p.logoUrl ? (
          <a
            key="logo"
            href={p.logoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold text-slate-700 underline underline-offset-2"
          >
            View
          </a>
        ) : (
          <span key="no" className="text-xs text-slate-400">
            —
          </span>
        ),
        <span key="created" className="text-xs text-slate-600">
          {/* ✅ use dateCreated only */}
          {fmtDate(p.dateCreated)}
        </span>,
        actions,
      ];
    });
  }, [items, canEdit, deleteM.isPending]);

  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Global masters are managed by NEC/System Admin. Tenants can view read-only."
          sources={["party"]}
        />
      ) : null}

      {/* Header actions */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search party name or abbreviation…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-260px outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
            title="Clear search"
          >
            Clear
          </button>
        </div>

        <div className="flex items-center gap-2">
          {canEdit ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              title="Create party (SYSTEM/NEC)"
            >
              <Plus size={16} />
              Create
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
            title="Refresh parties"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status */}
      {partiesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading parties…</div>
      ) : partiesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(partiesQ.error as any)?.message ?? "Failed to load parties."}
        </div>
      ) : null}

      {/* Compact table */}
      <CompactTable
        columns={["Party", "Abbrev", "Logo", "Created", "Actions"]}
        rows={
          rows.length
            ? rows
            : [
                [
                  <span key="empty" className="text-slate-500">
                    No parties found.
                  </span>,
                  "",
                  "",
                  "",
                  "",
                ],
              ]
        }
      />

      {/* Pagination */}
      <div className="flex justify-between items-center gap-2">
        <div className="text-xs text-slate-500">
          Page <b>{page + 1}</b> of <b>{totalPages}</b>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
              page <= 0 ? "opacity-50" : ""
            }`}
            title="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
              page >= totalPages - 1 ? "opacity-50" : ""
            }`}
            title="Next page"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM/NEC can create/edit/delete party master (global).",
            "If you later want ‘soft delete’, change delete to ‘deactivate’ and keep referenced parties safe.",
            "Search is server-side via ?q= and paged.",
          ]}
        />
      </div>

      {/* Modal */}
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
            className="w-full max-w-[620px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-base">
                  {editing ? "Edit Party" : "Create Party"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {editing
                    ? "Update party master data."
                    : "Create a new global party."}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  saving ? "opacity-60" : ""
                }`}
                title="Close"
              >
                Close
              </button>
            </div>

            <div className="grid gap-2.5 mt-3">
              {/* Party name */}
              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Party Name <span className="text-red-600">*</span>
                </div>
                <input
                  value={partyName}
                  onChange={(e) => {
                    setPartyName(e.target.value);
                    setTouched(true);
                  }}
                  placeholder="e.g., Unity Party"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                />
                {touched && !normalizeName(partyName) ? (
                  <div className="text-[11px] font-bold text-red-600">
                    Required
                  </div>
                ) : null}
              </div>

              {/* Abbrev + logo */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Abbreviation <span className="text-red-600">*</span>
                  </div>
                  <input
                    value={abbreviation}
                    onChange={(e) => {
                      setAbbreviation(e.target.value);
                      setTouched(true);
                    }}
                    placeholder="e.g., UP"
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                  />
                  {touched && !normalizeAbbrev(abbreviation) ? (
                    <div className="text-[11px] font-bold text-red-600">
                      Required
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Logo URL
                  </div>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://…"
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
              </div>

              {/* Errors */}
              {createM.isError || updateM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {createM.isError
                    ? friendlySaveError(createM.error)
                    : friendlySaveError(updateM.error)}
                </div>
              ) : null}

              {/* Footer */}
              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  disabled={saving}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    saving ? "opacity-60" : ""
                  }`}
                  title="Cancel"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={save}
                  disabled={!canEdit || saving}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || saving ? "opacity-60" : ""
                  }`}
                  title={canEdit ? "Save party" : "Read-only (Tenant)"}
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
