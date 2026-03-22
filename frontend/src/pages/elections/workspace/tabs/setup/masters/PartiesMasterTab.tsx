// // src/pages/elections/workspace/tabs/setup/masters/PartiesMasterTab.tsx


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
import { Pencil, Plus, RefreshCw, Search, Trash2, X, AlertCircle, CheckCircle } from "lucide-react";

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

/** ============ HELPERS ============ */
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

/** ============ MAIN COMPONENT ============ */
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

  /** ============ QUERIES ============ */
  const partiesQ = useQuery({
    queryKey: ["party-master", page, q],
    queryFn: () => searchParties({ page, size, q: q.trim() || undefined }),
    staleTime: 10_000,
    retry: 1,
  });

  const items = useMemo(() => partiesQ.data?.items ?? [], [partiesQ.data]);
  const totalPages = Math.max(1, partiesQ.data?.totalPages ?? 1);

  /** ============ HANDLERS (BEFORE MUTATIONS) ============ */
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

  /** ============ MUTATIONS ============ */
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

  /** ============ STATE ============ */
  const saving = createM.isPending || updateM.isPending;

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const partyNameValid = normalizeName(partyName);
  const abbreviationValid = normalizeAbbrev(abbreviation);

  /** ============ TABLE ROWS ============ */
  const rows = useMemo(() => {
    return items.map((p) => {
      const actions = (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-green-50 transition ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit party (SYSTEM/NEC)" : "Read-only (Tenant)"}
            onClick={() => openEdit(p)}
          >
            <Pencil size={20} />
          </button>

          <button
            type="button"
            disabled={!canEdit || deleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 ml-3 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 hover:bg-red-50 transition ${
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
            <Trash2 size={20} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <div key={p.partyId} className="grid gap-0.5">
          <div>{p.partyName}</div>
        </div>,
        <span key="abbr" className="text-slate-700">
          {p.abbreviation}
        </span>,
        p.logoUrl ? (
          <a
            key="logo"
            href={p.logoUrl}
            target="_blank"
            rel="noreferrer"
            className="text-base font-bold text-slate-700 underline underline-offset-2"
          >
            View
          </a>
        ) : (
          <span key="no" className="text-base text-slate-400">
            —
          </span>
        ),
        <span key="created" className="text-base text-slate-600">
          {fmtDate(p.dateCreated)}
        </span>,
        actions,
      ];
    });
  }, [items, canEdit, deleteM.isPending]);

  /** ============ RENDER ============ */
  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Global masters are managed by NEC/System Admin. Tenants can view read-only."
          sources={["party"]}
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
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Search party name or abbreviation…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-260px outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
              title="Create party (SYSTEM/NEC)"
            >
              <Plus size={16} />
              Add New
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
            title="Refresh parties"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============ STATUS ============ */}
      {partiesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading parties…</div>
      ) : partiesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(partiesQ.error as any)?.message ?? "Failed to load parties."}
        </div>
      ) : null}

      {/* ============ TABLE ============ */}
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

      {/* ============ PAGINATION ============ */}
      <div className="flex justify-between items-center gap-2">
        <div className="text-sm text-slate-500">
          Page <b>{page + 1}</b> of <b>{totalPages}</b>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              page <= 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Previous page"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              page >= totalPages - 1 ? "opacity-50 cursor-not-allowed" : ""
            }`}
            title="Next page"
          >
            Next
          </button>
        </div>
      </div>

      {/* ============ NOTES ============ */}
      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM/NEC can create/edit/delete party master (global).",
            "Search is server-side via ?q= and paged.",
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
                  {editing ? "✏️ Edit Party" : "➕ Create Party"}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  {editing
                    ? `Update "${safeStr(editing.partyName)}" master data.`
                    : "Create a new global party for election assignments."}
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
              {/* Party Name Field */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                  Party Name <span className="text-red-600">*</span>
                </label>
                <input
                  value={partyName}
                  onChange={(e) => {
                    setPartyName(e.target.value);
                    setTouched(true);
                  }}
                  placeholder="e.g., Unity Party"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {touched && !partyNameValid && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600 font-semibold">
                    <AlertCircle size={16} />
                    Party name is required
                  </div>
                )}
                {touched && partyNameValid && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600 font-semibold">
                    <CheckCircle size={16} />
                    Valid party name
                  </div>
                )}
              </div>

              {/* Two-column layout: Abbreviation + Logo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Abbreviation Field */}
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Abbreviation <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={abbreviation}
                    onChange={(e) => {
                      setAbbreviation(e.target.value);
                      setTouched(true);
                    }}
                    placeholder="e.g., UP"
                    maxLength={10}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  {touched && !abbreviationValid && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600 font-semibold">
                      <AlertCircle size={16} />
                      Abbreviation is required
                    </div>
                  )}
                  {touched && abbreviationValid && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-600 font-semibold">
                      <CheckCircle size={16} />
                      {abbreviationValid.length}/10 chars
                    </div>
                  )}
                </div>

                {/* Logo URL Field */}
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Logo URL <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    PNG, JPG, or SVG format recommended (max 2MB)
                  </p>
                </div>
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
                  <strong className="font-bold">💡 Tip:</strong> Party names and abbreviations must be unique across the system.
                  {editing && (
                    <>
                      {" "}
                      Changing these fields may affect existing election assignments.
                    </>
                  )}
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
                onClick={save}
                disabled={!canEdit || saving || !partyNameValid || !abbreviationValid}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || saving || !partyNameValid || !abbreviationValid
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
                title={canEdit ? "Save party" : "Read-only (Tenant)"}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span className="hidden sm:inline">{editing ? "Update Party" : "Create Party"}</span>
                    <span className="sm:hidden">{editing ? "Update" : "Create"}</span>
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


