// src/pages/elections/workspace/tabs/setup/masters/CandidatesMasterTab.tsx
import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Image as ImageIcon,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  ReadOnlyBanner,
  PlaceholderNote,
  Badge,
} from "../../../../shared/elections-ui";

import {
  createCandidate,
  deleteCandidate,
  searchCandidates,
  updateCandidate,
  type CandidateDto,
} from "../../../../../../shared/services/candidateService";

import {
  searchParties,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function fmtDate(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return safeStr(v);
  return d.toLocaleString();
}
function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}
function friendlySaveError(err: any): string {
  const msg =
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save candidate.";
  const looksDup = /duplicate|unique|already exists|constraint/i.test(msg);
  if (looksDup) return "Candidate already exists (possible duplicate).";
  return msg;
}

// ✅ fixes "isActive not fetched" issue (Spring may return active instead of isActive)
function getActiveValue(c: CandidateDto): boolean {
  const anyC: any = c as any;
  return Boolean(anyC?.isActive ?? anyC?.active ?? false);
}

// ✅ fixes "independent not fetched" issue (Spring/Jackson may return isIndependent)
function getIndependentValue(c: CandidateDto): boolean {
  const anyC: any = c as any;
  return Boolean(anyC?.independent ?? anyC?.isIndependent ?? false);
}

const PARTY_FILTER_INDEPENDENT = "__INDEPENDENT__";

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

export default function CandidatesMasterTab() {
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const size = 20;
  const [page, setPage] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [position, setPosition] = useState("");
  const [partyFilter, setPartyFilter] = useState(""); // partyId OR "__INDEPENDENT__"
  const [active, setActive] = useState<"" | "true" | "false">("");

  // photo viewer selection
  const [selected, setSelected] = useState<CandidateDto | null>(null);

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CandidateDto | null>(null);
  const [touched, setTouched] = useState(false);

  // form fields
  const [fullName, setFullName] = useState("");
  const [formPosition, setFormPosition] = useState("");
  const [formPartyId, setFormPartyId] = useState<string>("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [independent, setIndependent] = useState(false);

  // Parties for dropdown
  const partiesQ = useQuery({
    queryKey: ["party-master-dropdown"],
    queryFn: () => searchParties({ page: 0, size: 500, q: undefined }),
    staleTime: 60_000,
    retry: 1,
  });

  const parties: PartyDto[] = useMemo(
    () => partiesQ.data?.items ?? [],
    [partiesQ.data]
  );

  // ✅ Independent perfect paging:
  // when filter == Independent -> send independent=true and DO NOT send partyId
  const independentForApi =
    partyFilter === PARTY_FILTER_INDEPENDENT ? true : undefined;

  const partyIdForApi =
    partyFilter === "" || partyFilter === PARTY_FILTER_INDEPENDENT
      ? undefined
      : partyFilter;

  const candidatesQ = useQuery({
    queryKey: [
      "candidate-master",
      page,
      q,
      position,
      partyFilter, // include in key
      active,
    ],
    queryFn: () =>
      searchCandidates({
        page,
        size,
        q: q.trim() || undefined,
        position: position.trim() || undefined,
        partyId: partyIdForApi,
        active: active === "" ? undefined : active === "true",
        independent: independentForApi, // ✅ NEW param (perfect paging)
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const items = useMemo(
    () => candidatesQ.data?.items ?? [],
    [candidatesQ.data]
  );
  const totalPages = Math.max(1, candidatesQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["candidate-master"] });
    await candidatesQ.refetch();
  };

  const openCreate = () => {
    setEditing(null);
    setFullName("");
    setFormPosition("");
    setFormPartyId("");
    setPhotoUrl("");
    setIsActive(true); // ✅ default true
    setIndependent(false); // ✅ default unchecked
    setTouched(false);
    setOpen(true);
  };

  const openEdit = (c: CandidateDto) => {
    setEditing(c);
    setFullName(safeStr(c.fullName));
    setFormPosition(safeStr(c.position));
    setFormPartyId(safeStr((c as any)?.partyId));
    setPhotoUrl(safeStr(c.photoUrl));
    setIsActive(getActiveValue(c));
    setIndependent(getIndependentValue(c)); // ✅ uses db value safely
    setTouched(false);
    setOpen(true);
  };

  const createM = useMutation({
    mutationFn: async () => {
      const name = normalizeName(fullName);
      if (!name) throw new Error("Full name is required.");

      return createCandidate({
        fullName: name,
        position: formPosition.trim() || null,
        partyId: independent ? null : formPartyId || null,
        photoUrl: photoUrl.trim() || null,
        isActive,
        independent,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setTouched(false);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No candidate selected.");
      const name = normalizeName(fullName);
      if (!name) throw new Error("Full name is required.");

      return updateCandidate(editing.candidateId, {
        fullName: name,
        position: formPosition.trim() || null,
        partyId: independent ? null : formPartyId || null,
        photoUrl: photoUrl.trim() || null,
        isActive,
        independent,
      });
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setTouched(false);
      await refreshNow();
    },
  });

  const deleteM = useMutation({
    mutationFn: async (candidateId: string) => deleteCandidate(candidateId),
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const selectedRowIndex = useMemo(() => {
    if (!selected) return -1;
    return items.findIndex((x) => x.candidateId === selected.candidateId);
  }, [items, selected]);

  const rows = useMemo(() => {
    return items.map((c) => {
      const activeVal = getActiveValue(c);
      const independentVal = getIndependentValue(c);

      const partyLabel =
        independentVal || !c.partyName
          ? "—"
          : `${safeStr(c.partyName)}${
              c.abbreviation ? ` (${c.abbreviation})` : ""
            }`;

      // ✅ highly-visible checkboxes (DB-driven)
      const independentCheck = (
        <input
          type="checkbox"
          checked={independentVal}
          readOnly
          onClick={(e) => e.preventDefault()}
          className="h-4 w-4 accent-emerald-600"
          title={independentVal ? "Independent" : "Not independent"}
        />
      );

      const activeCheck = (
        <input
          type="checkbox"
          checked={activeVal}
          readOnly
          onClick={(e) => e.preventDefault()}
          className="h-4 w-4 accent-emerald-600"
          title={activeVal ? "Active" : "Inactive"}
        />
      );

      const actions = (
        <div
          className="flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            title="Show photo"
            onClick={() => setSelected(c)}
          >
            <ImageIcon size={16} />
          </button>

          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={
              canEdit ? "Edit candidate (SYSTEM/NEC)" : "Read-only (Tenant)"
            }
            onClick={() => openEdit(c)}
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            disabled={!canEdit || deleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 ${
              !canEdit || deleteM.isPending ? "opacity-60" : ""
            }`}
            title={
              canEdit ? "Delete candidate (SYSTEM/NEC)" : "Read-only (Tenant)"
            }
            onClick={() => {
              const ok = window.confirm(
                `Delete candidate "${c.fullName}"?\nThis is permanent.`
              );
              if (ok) deleteM.mutate(c.candidateId);
            }}
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      );

      return [
        // ✅ name only (no underline/second line)
        <div key={c.candidateId}>{c.fullName}</div>,

        <span key="pos" className="text-slate-700">
          {c.position ? c.position : <span className="text-slate-400">—</span>}
        </span>,

        <span key="party" className="text-slate-700">
          {independentVal ? "Independent" : partyLabel}
        </span>,

        <div key="ind" className="flex justify-center">
          {independentCheck}
        </div>,

        <div key="act" className="flex justify-center">
          {activeCheck}
        </div>,

        <span key="created" className="text-xs text-slate-600">
          {fmtDate(c.dateCreated)}
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
          sources={["candidate"]}
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
              placeholder="Search candidate name…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[240px] outline-none"
            />
          </div>

          <input
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by position…"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[200px] outline-none"
          />

          {/* ✅ Party filter includes Independent option (perfect paging via independent=true) */}
          <select
            value={partyFilter}
            onChange={(e) => {
              setPartyFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none"
          >
            <option value="">All parties</option>
            <option value={PARTY_FILTER_INDEPENDENT}>Independent</option>
            {parties.map((p) => (
              <option key={p.partyId} value={p.partyId}>
                {p.partyName} ({p.abbreviation})
              </option>
            ))}
          </select>

          <select
            value={active}
            onChange={(e) => {
              setActive(e.target.value as any);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none"
          >
            <option value="">All status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setPosition("");
              setPartyFilter("");
              setActive("");
              setPage(0);
              setSelected(null);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
            title="Clear filters"
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
              title="Create candidate (SYSTEM/NEC)"
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
            disabled={candidatesQ.isFetching}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              candidatesQ.isFetching ? "opacity-60" : ""
            }`}
            title="Refresh candidates"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status */}
      {candidatesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading candidates…</div>
      ) : candidatesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(candidatesQ.error as any)?.message ?? "Failed to load candidates."}
        </div>
      ) : null}

      {/* Table + Photo Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <div>
          <CompactTable
            columns={[
              "Candidate",
              "Position",
              "Party",
              "Independent",
              "Active",
              "Created",
              "Actions",
            ]}
            rows={
              rows.length
                ? rows
                : [
                    [
                      <span key="empty" className="text-slate-500">
                        No candidates found.
                      </span>,
                      "",
                      "",
                      "",
                      "",
                      "",
                      "",
                    ],
                  ]
            }
            onRowClick={(idx) => setSelected(items[idx] ?? null)}
            selectedRowIndex={selectedRowIndex}
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="text-[11px] font-extrabold text-slate-600 mb-2">
            Candidate Photo
          </div>

          {selected?.photoUrl ? (
            <img
              src={selected.photoUrl}
              alt={selected.fullName}
              className="w-full h-[280px] object-cover rounded-lg border border-slate-200"
            />
          ) : (
            <div className="w-full h-[280px] rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-sm text-center px-3">
              {selected
                ? "No photo available for this candidate."
                : "Select a candidate (or click the photo button) to view photo."}
            </div>
          )}

          {selected ? (
            <div className="mt-2 text-sm text-slate-700">
              <div className="font-extrabold">{selected.fullName}</div>
              <div className="text-xs text-slate-500">
                {selected.position || "—"}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {getIndependentValue(selected)
                  ? "Independent"
                  : selected.partyName
                  ? `${selected.partyName}${
                      selected.abbreviation ? ` (${selected.abbreviation})` : ""
                    }`
                  : "—"}
              </div>
            </div>
          ) : null}
        </div>
      </div>

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
            "SYSTEM/NEC can create/edit/delete candidate master (global).",
            "Independent filter is server-side via independent=true (perfect paging).",
            "Search is server-side via q/position/partyId/active/independent and paged.",
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
            className="w-full max-w-[720px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-base">
                  {editing ? "Edit Candidate" : "Create Candidate"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {editing
                    ? "Update candidate master data."
                    : "Create a new global candidate."}
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
              {/* Full name */}
              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Full Name <span className="text-red-600">*</span>
                </div>
                <input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setTouched(true);
                  }}
                  placeholder="e.g., Jane Doe"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                />
                {touched && !normalizeName(fullName) ? (
                  <div className="text-[11px] font-bold text-red-600">
                    Required
                  </div>
                ) : null}
              </div>

              {/* Position + Active checkbox */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Position
                  </div>
                  <input
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="e.g., President"
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Active
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Active
                  </label>
                </div>
              </div>

              {/* Independent checkbox + Party */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Independent
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={independent}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setIndependent(v);
                        if (v) setFormPartyId("");
                      }}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    Independent
                  </label>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Party
                  </div>
                  <select
                    value={formPartyId}
                    onChange={(e) => setFormPartyId(e.target.value)}
                    disabled={independent}
                    className={`px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white ${
                      independent ? "opacity-60" : ""
                    }`}
                  >
                    <option value="">—</option>
                    {parties.map((p) => (
                      <option key={p.partyId} value={p.partyId}>
                        {p.partyName} ({p.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo URL */}
              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Photo URL
                </div>
                <input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://…"
                  className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                />
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
                  title={canEdit ? "Save candidate" : "Read-only (Tenant)"}
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

// // src/pages/elections/workspace/tabs/setup/masters/CandidatesMasterTab.tsx
// import React, { useMemo, useState } from "react";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import {
//   Pencil,
//   Plus,
//   RefreshCw,
//   Search,
//   Trash2,
//   Image as ImageIcon,
// } from "lucide-react";

// import { useAuthStore } from "../../../../../../shared/store/authStore";

// import {
//   ReadOnlyBanner,
//   PlaceholderNote,
//   Badge,
// } from "../../../../shared/elections-ui";

// import {
//   createCandidate,
//   deleteCandidate,
//   searchCandidates,
//   updateCandidate,
//   type CandidateDto,
// } from "../../../../../../shared/services/candidateService";

// import {
//   searchParties,
//   type PartyDto,
// } from "../../../../../../shared/services/partyService";

// /** ---------------- helpers ---------------- */
// function safeStr(v: any) {
//   return typeof v === "string" ? v : v == null ? "" : String(v);
// }
// function fmtDate(v: any): string {
//   if (!v) return "";
//   const d = new Date(v);
//   if (Number.isNaN(d.getTime())) return safeStr(v);
//   return d.toLocaleString();
// }
// function normalizeName(v: string) {
//   return v.trim().replace(/\s+/g, " ");
// }
// function friendlySaveError(err: any): string {
//   const msg =
//     safeStr(err?.response?.data?.message) ||
//     safeStr(err?.response?.data?.error) ||
//     safeStr(err?.message) ||
//     "Failed to save candidate.";
//   const looksDup = /duplicate|unique|already exists|constraint/i.test(msg);
//   if (looksDup) return "Candidate already exists (possible duplicate).";
//   return msg;
// }

// // ✅ fixes "isActive not fetched" issue (Spring may return active instead of isActive)
// function getActiveValue(c: CandidateDto): boolean {
//   const anyC: any = c as any;
//   return Boolean(anyC?.isActive ?? anyC?.active ?? false);
// }

// /** Compact table (reduced row padding) */
// function CompactTable(props: {
//   columns: string[];
//   rows: React.ReactNode[][];
//   onRowClick?: (index: number) => void;
//   selectedRowIndex?: number;
// }) {
//   const { columns, rows, onRowClick, selectedRowIndex } = props;
//   return (
//     <div className="w-full overflow-auto rounded-xl border border-slate-200 bg-white">
//       <table className="w-full border-collapse text-sm">
//         <thead>
//           <tr className="bg-slate-50">
//             {columns.map((c) => (
//               <th
//                 key={c}
//                 className="text-left px-3 py-1.5 text-[11px] font-extrabold text-slate-600 border-b border-slate-200"
//               >
//                 {c}
//               </th>
//             ))}
//           </tr>
//         </thead>

//         <tbody>
//           {rows.map((r, idx) => (
//             <tr
//               key={idx}
//               onClick={onRowClick ? () => onRowClick(idx) : undefined}
//               className={`border-b border-slate-100 last:border-b-0 ${
//                 onRowClick ? "cursor-pointer hover:bg-slate-50" : ""
//               } ${selectedRowIndex === idx ? "bg-slate-50" : ""}`}
//             >
//               {r.map((cell, j) => (
//                 <td key={j} className="px-3 py-1.5 align-top text-slate-800">
//                   {cell}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default function CandidatesMasterTab() {
//   const qc = useQueryClient();

//   const dashboardMode = useAuthStore((s) => s.dashboardMode);
//   const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

//   const size = 20;
//   const [page, setPage] = useState(0);

//   // filters
//   const [q, setQ] = useState("");
//   const [position, setPosition] = useState("");
//   const [partyId, setPartyId] = useState("");
//   const [active, setActive] = useState<"" | "true" | "false">("");

//   // photo viewer selection
//   const [selected, setSelected] = useState<CandidateDto | null>(null);

//   // modal
//   const [open, setOpen] = useState(false);
//   const [editing, setEditing] = useState<CandidateDto | null>(null);
//   const [touched, setTouched] = useState(false);

//   // form fields
//   const [fullName, setFullName] = useState("");
//   const [formPosition, setFormPosition] = useState("");
//   const [formPartyId, setFormPartyId] = useState<string>("");
//   const [photoUrl, setPhotoUrl] = useState("");
//   const [isActive, setIsActive] = useState(true);
//   const [independent, setIndependent] = useState(false);

//   // Parties for dropdown
//   const partiesQ = useQuery({
//     queryKey: ["party-master-dropdown"],
//     queryFn: () => searchParties({ page: 0, size: 500, q: undefined }),
//     staleTime: 60_000,
//     retry: 1,
//   });

//   const parties: PartyDto[] = useMemo(
//     () => partiesQ.data?.items ?? [],
//     [partiesQ.data]
//   );

//   const candidatesQ = useQuery({
//     queryKey: ["candidate-master", page, q, position, partyId, active],
//     queryFn: () =>
//       searchCandidates({
//         page,
//         size,
//         q: q.trim() || undefined,
//         position: position.trim() || undefined,
//         partyId: partyId || undefined,
//         active: active === "" ? undefined : active === "true",
//       }),
//     staleTime: 10_000,
//     retry: 1,
//   });

//   const items = useMemo(
//     () => candidatesQ.data?.items ?? [],
//     [candidatesQ.data]
//   );
//   const totalPages = Math.max(1, candidatesQ.data?.totalPages ?? 1);

//   const refreshNow = async () => {
//     await qc.invalidateQueries({ queryKey: ["candidate-master"] });
//     await candidatesQ.refetch();
//   };

//   const openCreate = () => {
//     setEditing(null);
//     setFullName("");
//     setFormPosition("");
//     setFormPartyId("");
//     setPhotoUrl("");
//     setIsActive(true); // ✅ default true
//     setIndependent(false); // ✅ default unchecked
//     setTouched(false);
//     setOpen(true);
//   };

//   const openEdit = (c: CandidateDto) => {
//     setEditing(c);
//     setFullName(safeStr(c.fullName));
//     setFormPosition(safeStr(c.position));
//     setFormPartyId(safeStr(c.partyId));
//     setPhotoUrl(safeStr(c.photoUrl));
//     setIsActive(getActiveValue(c)); // ✅ uses db value safely
//     setIndependent(!!c.independent);
//     setTouched(false);
//     setOpen(true);
//   };

//   const createM = useMutation({
//     mutationFn: async () => {
//       const name = normalizeName(fullName);
//       if (!name) throw new Error("Full name is required.");

//       return createCandidate({
//         fullName: name,
//         position: formPosition.trim() || null,
//         partyId: independent ? null : formPartyId || null,
//         photoUrl: photoUrl.trim() || null,
//         isActive,
//         independent,
//       });
//     },
//     onSuccess: async () => {
//       setOpen(false);
//       setEditing(null);
//       setTouched(false);
//       await refreshNow();
//     },
//   });

//   const updateM = useMutation({
//     mutationFn: async () => {
//       if (!editing) throw new Error("No candidate selected.");
//       const name = normalizeName(fullName);
//       if (!name) throw new Error("Full name is required.");

//       return updateCandidate(editing.candidateId, {
//         fullName: name,
//         position: formPosition.trim() || null,
//         partyId: independent ? null : formPartyId || null,
//         photoUrl: photoUrl.trim() || null,
//         isActive,
//         independent,
//       });
//     },
//     onSuccess: async () => {
//       setOpen(false);
//       setEditing(null);
//       setTouched(false);
//       await refreshNow();
//     },
//   });

//   const deleteM = useMutation({
//     mutationFn: async (candidateId: string) => deleteCandidate(candidateId),
//     onSuccess: refreshNow,
//   });

//   const saving = createM.isPending || updateM.isPending;

//   const save = () => {
//     setTouched(true);
//     if (!canEdit) return;
//     if (editing) updateM.mutate();
//     else createM.mutate();
//   };

//   const selectedRowIndex = useMemo(() => {
//     if (!selected) return -1;
//     return items.findIndex((x) => x.candidateId === selected.candidateId);
//   }, [items, selected]);

//   const rows = useMemo(() => {
//     return items.map((c) => {
//       const activeVal = getActiveValue(c);

//       const partyLabel =
//         c.independent || !c.partyName
//           ? "—"
//           : `${safeStr(c.partyName)}${
//               c.abbreviation ? ` (${c.abbreviation})` : ""
//             }`;

//       // ✅ highly-visible checkboxes (DB-driven)
//       const independentCheck = (
//         <input
//           type="checkbox"
//           checked={!!c.independent}
//           readOnly
//           onClick={(e) => e.preventDefault()}
//           className="h-4 w-4 accent-emerald-600"
//           title={c.independent ? "Independent" : "Not independent"}
//         />
//       );

//       const activeCheck = (
//         <input
//           type="checkbox"
//           checked={activeVal}
//           readOnly
//           onClick={(e) => e.preventDefault()}
//           className="h-4 w-4 accent-emerald-600"
//           title={activeVal ? "Active" : "Inactive"}
//         />
//       );

//       const actions = (
//         <div
//           className="flex flex-wrap gap-2"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <button
//             type="button"
//             className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
//             title="Show photo"
//             onClick={() => setSelected(c)}
//           >
//             <ImageIcon size={16} />
//           </button>

//           <button
//             type="button"
//             disabled={!canEdit}
//             className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
//               !canEdit ? "opacity-60" : ""
//             }`}
//             title={
//               canEdit ? "Edit candidate (SYSTEM/NEC)" : "Read-only (Tenant)"
//             }
//             onClick={() => openEdit(c)}
//           >
//             <Pencil size={16} />
//           </button>

//           <button
//             type="button"
//             disabled={!canEdit || deleteM.isPending}
//             className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 ${
//               !canEdit || deleteM.isPending ? "opacity-60" : ""
//             }`}
//             title={
//               canEdit ? "Delete candidate (SYSTEM/NEC)" : "Read-only (Tenant)"
//             }
//             onClick={() => {
//               const ok = window.confirm(
//                 `Delete candidate "${c.fullName}"?\nThis is permanent.`
//               );
//               if (ok) deleteM.mutate(c.candidateId);
//             }}
//           >
//             <Trash2 size={16} className="text-red-600" />
//           </button>
//         </div>
//       );

//       return [
//         // ✅ name only (no underline/second line)
//         <div key={c.candidateId}>{c.fullName}</div>,

//         <span key="pos" className="text-slate-700">
//           {c.position ? c.position : <span className="text-slate-400">—</span>}
//         </span>,

//         <span key="party" className="text-slate-700">
//           {c.independent ? "Independent" : partyLabel}
//         </span>,

//         <div key="ind" className="flex justify-center">
//           {independentCheck}
//         </div>,

//         <div key="act" className="flex justify-center">
//           {activeCheck}
//         </div>,

//         <span key="created" className="text-xs text-slate-600">
//           {fmtDate(c.dateCreated)}
//         </span>,

//         actions,
//       ];
//     });
//   }, [items, canEdit, deleteM.isPending]);

//   return (
//     <div className="flex flex-col gap-3">
//       {!canEdit ? (
//         <ReadOnlyBanner
//           reason="Global masters are managed by NEC/System Admin. Tenants can view read-only."
//           sources={["candidate"]}
//         />
//       ) : null}

//       {/* Header actions */}
//       <div className="flex items-center justify-between gap-2 flex-wrap">
//         <div className="flex items-center gap-2 flex-wrap">
//           <div className="relative">
//             <Search
//               size={16}
//               className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
//             />
//             <input
//               value={q}
//               onChange={(e) => {
//                 setQ(e.target.value);
//                 setPage(0);
//               }}
//               placeholder="Search candidate name…"
//               className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[240px] outline-none"
//             />
//           </div>

//           <input
//             value={position}
//             onChange={(e) => {
//               setPosition(e.target.value);
//               setPage(0);
//             }}
//             placeholder="Filter by position…"
//             className="px-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[200px] outline-none"
//           />

//           <select
//             value={partyId}
//             onChange={(e) => {
//               setPartyId(e.target.value);
//               setPage(0);
//             }}
//             className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none"
//           >
//             <option value="">All parties</option>
//             {parties.map((p) => (
//               <option key={p.partyId} value={p.partyId}>
//                 {p.partyName} ({p.abbreviation})
//               </option>
//             ))}
//           </select>

//           <select
//             value={active}
//             onChange={(e) => {
//               setActive(e.target.value as any);
//               setPage(0);
//             }}
//             className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none"
//           >
//             <option value="">All status</option>
//             <option value="true">Active</option>
//             <option value="false">Inactive</option>
//           </select>

//           <button
//             type="button"
//             onClick={() => {
//               setQ("");
//               setPosition("");
//               setPartyId("");
//               setActive("");
//               setPage(0);
//               setSelected(null);
//             }}
//             className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
//             title="Clear filters"
//           >
//             Clear
//           </button>
//         </div>

//         <div className="flex items-center gap-2">
//           {canEdit ? (
//             <button
//               type="button"
//               onClick={openCreate}
//               className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
//               title="Create candidate (SYSTEM/NEC)"
//             >
//               <Plus size={16} />
//               Create
//             </button>
//           ) : (
//             <Badge text="Read-only (Tenant)" />
//           )}

//           <button
//             type="button"
//             onClick={refreshNow}
//             disabled={candidatesQ.isFetching}
//             className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
//               candidatesQ.isFetching ? "opacity-60" : ""
//             }`}
//             title="Refresh candidates"
//           >
//             <RefreshCw size={16} />
//             Refresh
//           </button>
//         </div>
//       </div>

//       {/* Status */}
//       {candidatesQ.isLoading ? (
//         <div className="p-2 text-slate-600">Loading candidates…</div>
//       ) : candidatesQ.isError ? (
//         <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
//           {(candidatesQ.error as any)?.message ?? "Failed to load candidates."}
//         </div>
//       ) : null}

//       {/* Table + Photo Viewer */}
//       <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
//         <div>
//           <CompactTable
//             columns={[
//               "Candidate",
//               "Position",
//               "Party",
//               "Independent",
//               "Active",
//               "Created",
//               "Actions",
//             ]}
//             rows={
//               rows.length
//                 ? rows
//                 : [
//                     [
//                       <span key="empty" className="text-slate-500">
//                         No candidates found.
//                       </span>,
//                       "",
//                       "",
//                       "",
//                       "",
//                       "",
//                       "",
//                     ],
//                   ]
//             }
//             onRowClick={(idx) => setSelected(items[idx] ?? null)}
//             selectedRowIndex={selectedRowIndex}
//           />
//         </div>

//         <div className="rounded-xl border border-slate-200 bg-white p-3">
//           <div className="text-[11px] font-extrabold text-slate-600 mb-2">
//             Candidate Photo
//           </div>

//           {selected?.photoUrl ? (
//             <img
//               src={selected.photoUrl}
//               alt={selected.fullName}
//               className="w-full h-[280px] object-cover rounded-lg border border-slate-200"
//             />
//           ) : (
//             <div className="w-full h-[280px] rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500 text-sm text-center px-3">
//               {selected
//                 ? "No photo available for this candidate."
//                 : "Select a candidate (or click the photo button) to view photo."}
//             </div>
//           )}

//           {selected ? (
//             <div className="mt-2 text-sm text-slate-700">
//               <div className="font-extrabold">{selected.fullName}</div>
//               <div className="text-xs text-slate-500">
//                 {selected.position || "—"}
//               </div>
//               <div className="text-xs text-slate-500 mt-1">
//                 {selected.independent
//                   ? "Independent"
//                   : selected.partyName
//                   ? `${selected.partyName}${
//                       selected.abbreviation ? ` (${selected.abbreviation})` : ""
//                     }`
//                   : "—"}
//               </div>
//             </div>
//           ) : null}
//         </div>
//       </div>

//       {/* Pagination */}
//       <div className="flex justify-between items-center gap-2">
//         <div className="text-xs text-slate-500">
//           Page <b>{page + 1}</b> of <b>{totalPages}</b>
//         </div>
//         <div className="flex gap-2">
//           <button
//             type="button"
//             disabled={page <= 0}
//             onClick={() => setPage((p) => Math.max(0, p - 1))}
//             className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
//               page <= 0 ? "opacity-50" : ""
//             }`}
//             title="Previous page"
//           >
//             Prev
//           </button>
//           <button
//             type="button"
//             disabled={page >= totalPages - 1}
//             onClick={() => setPage((p) => p + 1)}
//             className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
//               page >= totalPages - 1 ? "opacity-50" : ""
//             }`}
//             title="Next page"
//           >
//             Next
//           </button>
//         </div>
//       </div>

//       <div className="mt-1">
//         <PlaceholderNote
//           title="Notes"
//           bullets={[
//             "SYSTEM/NEC can create/edit/delete candidate master (global).",
//             "Deleting candidates referenced by election_candidate may fail; consider deactivate instead.",
//             "Search is server-side via q/position/partyId/active and paged.",
//           ]}
//         />
//       </div>

//       {/* Modal */}
//       {open ? (
//         <div
//           role="dialog"
//           aria-modal="true"
//           className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
//           onClick={() => {
//             if (saving) return;
//             setOpen(false);
//           }}
//         >
//           <div
//             className="w-full max-w-[720px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex justify-between gap-3">
//               <div>
//                 <div className="font-extrabold text-base">
//                   {editing ? "Edit Candidate" : "Create Candidate"}
//                 </div>
//                 <div className="text-xs text-slate-500 mt-0.5">
//                   {editing
//                     ? "Update candidate master data."
//                     : "Create a new global candidate."}
//                 </div>
//               </div>

//               <button
//                 type="button"
//                 onClick={() => setOpen(false)}
//                 disabled={saving}
//                 className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
//                   saving ? "opacity-60" : ""
//                 }`}
//                 title="Close"
//               >
//                 Close
//               </button>
//             </div>

//             <div className="grid gap-2.5 mt-3">
//               {/* Full name */}
//               <div className="grid gap-1.5">
//                 <div className="text-[11px] font-extrabold text-slate-600">
//                   Full Name <span className="text-red-600">*</span>
//                 </div>
//                 <input
//                   value={fullName}
//                   onChange={(e) => {
//                     setFullName(e.target.value);
//                     setTouched(true);
//                   }}
//                   placeholder="e.g., Jane Doe"
//                   className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
//                 />
//                 {touched && !normalizeName(fullName) ? (
//                   <div className="text-[11px] font-bold text-red-600">
//                     Required
//                   </div>
//                 ) : null}
//               </div>

//               {/* Position + Active checkbox */}
//               <div className="grid grid-cols-2 gap-2.5">
//                 <div className="grid gap-1.5">
//                   <div className="text-[11px] font-extrabold text-slate-600">
//                     Position
//                   </div>
//                   <input
//                     value={formPosition}
//                     onChange={(e) => setFormPosition(e.target.value)}
//                     placeholder="e.g., President"
//                     className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
//                   />
//                 </div>

//                 <div className="grid gap-1.5">
//                   <div className="text-[11px] font-extrabold text-slate-600">
//                     Active
//                   </div>
//                   <label className="inline-flex items-center gap-2 text-sm text-slate-700">
//                     <input
//                       type="checkbox"
//                       checked={isActive}
//                       onChange={(e) => setIsActive(e.target.checked)}
//                       className="h-4 w-4 accent-emerald-600"
//                     />
//                     Active
//                   </label>
//                 </div>
//               </div>

//               {/* Independent checkbox + Party */}
//               <div className="grid grid-cols-2 gap-2.5">
//                 <div className="grid gap-1.5">
//                   <div className="text-[11px] font-extrabold text-slate-600">
//                     Independent
//                   </div>
//                   <label className="inline-flex items-center gap-2 text-sm text-slate-700">
//                     <input
//                       type="checkbox"
//                       checked={independent}
//                       onChange={(e) => {
//                         const v = e.target.checked;
//                         setIndependent(v);
//                         if (v) setFormPartyId("");
//                       }}
//                       className="h-4 w-4 accent-emerald-600"
//                     />
//                     Independent
//                   </label>
//                 </div>

//                 <div className="grid gap-1.5">
//                   <div className="text-[11px] font-extrabold text-slate-600">
//                     Party
//                   </div>
//                   <select
//                     value={formPartyId}
//                     onChange={(e) => setFormPartyId(e.target.value)}
//                     disabled={independent}
//                     className={`px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white ${
//                       independent ? "opacity-60" : ""
//                     }`}
//                   >
//                     <option value="">—</option>
//                     {parties.map((p) => (
//                       <option key={p.partyId} value={p.partyId}>
//                         {p.partyName} ({p.abbreviation})
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//               </div>

//               {/* Photo URL */}
//               <div className="grid gap-1.5">
//                 <div className="text-[11px] font-extrabold text-slate-600">
//                   Photo URL
//                 </div>
//                 <input
//                   value={photoUrl}
//                   onChange={(e) => setPhotoUrl(e.target.value)}
//                   placeholder="https://…"
//                   className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
//                 />
//               </div>

//               {/* Errors */}
//               {createM.isError || updateM.isError ? (
//                 <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
//                   {createM.isError
//                     ? friendlySaveError(createM.error)
//                     : friendlySaveError(updateM.error)}
//                 </div>
//               ) : null}

//               {/* Footer */}
//               <div className="flex justify-end gap-2 mt-1">
//                 <button
//                   type="button"
//                   onClick={() => setOpen(false)}
//                   disabled={saving}
//                   className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
//                     saving ? "opacity-60" : ""
//                   }`}
//                   title="Cancel"
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   type="button"
//                   onClick={save}
//                   disabled={!canEdit || saving}
//                   className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
//                     !canEdit || saving ? "opacity-60" : ""
//                   }`}
//                   title={canEdit ? "Save candidate" : "Read-only (Tenant)"}
//                 >
//                   Save
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }
