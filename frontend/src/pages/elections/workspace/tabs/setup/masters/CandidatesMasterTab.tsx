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
  X,
  AlertCircle,
  CheckCircle,
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

/** ============ HELPERS ============ */
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

  /** ============ PARTIES DROPDOWN ============ */
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

  /** ============ CANDIDATES QUERY ============ */
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
      partyFilter,
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
        independent: independentForApi,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const items = useMemo(
    () => candidatesQ.data?.items ?? [],
    [candidatesQ.data]
  );
  const totalPages = Math.max(1, candidatesQ.data?.totalPages ?? 1);

  /** ============ HANDLERS (BEFORE MUTATIONS) ============ */
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
    setIsActive(true);
    setIndependent(false);
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
    setIndependent(getIndependentValue(c));
    setTouched(false);
    setOpen(true);
  };

  /** ============ MUTATIONS ============ */
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

  /** ============ STATE ============ */
  const saving = createM.isPending || updateM.isPending;

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  const fullNameValid = normalizeName(fullName);

  const selectedRowIndex = useMemo(() => {
    if (!selected) return -1;
    return items.findIndex((x) => x.candidateId === selected.candidateId);
  }, [items, selected]);

  /** ============ TABLE ROWS ============ */
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
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-blue-500 hover:bg-blue-50 transition"
            title="Show photo"
            onClick={() => setSelected(c)}
          >
            <ImageIcon size={20} />
          </button>

          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-green-50 transition ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={
              canEdit ? "Edit candidate (SYSTEM/NEC)" : "Read-only (Tenant)"
            }
            onClick={() => openEdit(c)}
          >
            <Pencil size={20} />
          </button>

          <button
            type="button"
            disabled={!canEdit || deleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 hover:bg-red-50 transition ${
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
            <Trash2 size={20} className="text-red-600" />
          </button>
        </div>
      );

      return [
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

        <span key="created" className="text-base text-slate-600">
          {fmtDate(c.dateCreated)}
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
          sources={["candidate"]}
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
              placeholder="Search candidate name…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[240px] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <input
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by position…"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[200px] outline-none focus:ring-2 focus:ring-blue-500"
          />

          <select
            value={partyFilter}
            onChange={(e) => {
              setPartyFilter(e.target.value);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
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
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
              title="Create candidate (SYSTEM/NEC)"
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
            disabled={candidatesQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              candidatesQ.isFetching ? "opacity-60" : ""
            }`}
            title="Refresh candidates"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============ STATUS ============ */}
      {candidatesQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading candidates…</div>
      ) : candidatesQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(candidatesQ.error as any)?.message ?? "Failed to load candidates."}
        </div>
      ) : null}

      {/* ============ TABLE + PHOTO VIEWER ============ */}
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
          <div className="text-sm font-extrabold text-slate-600 mb-2">
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
            "SYSTEM/NEC can create/edit/delete candidate master (global).",
            "Independent filter is server-side via independent=true (perfect paging).",
            "Search is server-side via q/position/partyId/active/independent and paged.",
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
            className="w-full max-w-210 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ============ HEADER WITH BLUE GRADIENT ============ */}
            <div className="bg-gradient-to-r from-blue-700 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white">
                  {editing ? "✏️ Edit Candidate" : "➕ Create Candidate"}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  {editing
                    ? `Update "${safeStr(editing.fullName)}" master data.`
                    : "Create a new global candidate for elections."}
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
              {/* Full Name Field */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                  Full Name <span className="text-red-600">*</span>
                </label>
                <input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setTouched(true);
                  }}
                  placeholder="e.g., Jane Doe"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                {touched && !fullNameValid && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-red-600 font-semibold">
                    <AlertCircle size={16} />
                    Full name is required
                  </div>
                )}
                {touched && fullNameValid && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600 font-semibold">
                    <CheckCircle size={16} />
                    Valid candidate name
                  </div>
                )}
              </div>

              {/* Position + Active Checkbox */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Position Field */}
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Position <span className="text-slate-400">(optional)</span>
                  </label>
                  <input
                    value={formPosition}
                    onChange={(e) => setFormPosition(e.target.value)}
                    placeholder="e.g., President"
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  />
                </div>

                {/* Active Checkbox */}
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Status
                  </label>
                  <label className="inline-flex items-center gap-3 text-base font-semibold text-slate-700 p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-5 w-5 accent-blue-600 cursor-pointer"
                    />
                    <span>Active</span>
                  </label>
                </div>
              </div>

              {/* Independent Checkbox + Party Dropdown */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Independent Checkbox */}
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Party Affiliation
                  </label>
                  <label className="inline-flex items-center gap-3 text-base font-semibold text-slate-700 p-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <input
                      type="checkbox"
                      checked={independent}
                      onChange={(e) => {
                        const v = e.target.checked;
                        setIndependent(v);
                        if (v) setFormPartyId("");
                      }}
                      className="h-5 w-5 accent-blue-600 cursor-pointer"
                    />
                    <span>Independent</span>
                  </label>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">
                    Check if candidate is running independently
                  </p>
                </div>

                {/* Party Dropdown */}
                <div>
                  <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                    Party <span className="text-slate-400">(optional)</span>
                  </label>
                  <select
                    value={formPartyId}
                    onChange={(e) => setFormPartyId(e.target.value)}
                    disabled={independent}
                    className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                      independent ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <option value="">-- Select Party --</option>
                    {parties.map((p) => (
                      <option key={p.partyId} value={p.partyId}>
                        {p.partyName} ({p.abbreviation})
                      </option>
                    ))}
                  </select>
                  {independent && (
                    <p className="text-xs sm:text-sm text-amber-600 font-semibold mt-2">
                      📌 Party field is disabled for independent candidates
                    </p>
                  )}
                </div>
              </div>

              {/* Photo URL Field */}
              <div>
                <label className="block text-base sm:text-lg font-bold text-slate-900 mb-2 sm:mb-3">
                  Photo URL <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://example.com/photo.jpg"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <p className="text-xs sm:text-sm text-slate-500 mt-2">
                  PNG, JPG, or SVG format recommended (max 2MB)
                </p>
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
                  <strong className="font-bold">💡 Tip:</strong> Candidate full names must be unique across the system. 
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
                disabled={!canEdit || saving || !fullNameValid}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || saving || !fullNameValid
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
                title={canEdit ? "Save candidate" : "Read-only (Tenant)"}
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} />
                    <span className="hidden sm:inline">{editing ? "Update Candidate" : "Create Candidate"}</span>
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
