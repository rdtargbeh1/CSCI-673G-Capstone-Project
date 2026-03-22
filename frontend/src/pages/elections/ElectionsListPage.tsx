

// // src/pages/elections/ElectionsListPage.tsx

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Power,
  PowerOff,
} from "lucide-react";

import { useAuthStore } from "../../shared/store/authStore";

import {
  createElection,
  deleteElection,
  searchElections,
  setElectionActive,
  updateElection,
  type ElectionDto,
  type ElectionType,
} from "../../shared/services/electionService";

import {
  Panel,
  SimpleTable,
  PlaceholderNote,
  SectionTitle,
  Badge,
} from "./shared/elections-ui";

/** ============ HELPERS ============ */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function normalizeName(v: string) {
  return v.trim().replace(/\s+/g, " ");
}
function toIntOrUndef(v: string): number | undefined {
  const s = v.trim();
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function friendlySaveError(err: any): string {
  const msg =
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Failed to save election.";

  const looksDup = /duplicate|unique|already exists|constraint/i.test(msg);
  if (looksDup) {
    return "Election already exists (same Name + Year). Please choose a different name or year.";
  }
  return msg;
}
function fmtDate(v: any): string {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
  if (Number.isNaN(d.getTime())) return safeStr(v);
  return d.toLocaleString();
}

const ELECTION_TYPE_OPTIONS: { value: ElectionType; label: string }[] = [
  { value: "PRESIDENTIAL", label: "Presidential" },
  { value: "LEGISLATIVE", label: "Legislative" },
  { value: "SENATORIAL", label: "Senatorial" },
  { value: "REPRESENTATIVE", label: "Representative" },
  { value: "REFERENDUM", label: "Referendum" },
  { value: "PRESIDENTIAL_GENERAL", label: "Presidential General" },
  { value: "BY_ELECTION", label: "By-Election" },
  { value: "LOCAL", label: "Local" },
];

export default function ElectionsListPage() {
  const nav = useNavigate();
  const qc = useQueryClient();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const size = 20;
  const [page, setPage] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [year, setYear] = useState("");
  const [type, setType] = useState<ElectionType | "">("");

  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "all"
  >("active");
  const activeBool: boolean | undefined =
    statusFilter === "all" ? undefined : statusFilter === "active";

  // modal
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ElectionDto | null>(null);
  const [touched, setTouched] = useState(false);

  // form fields
  const [electionName, setElectionName] = useState("");
  const [formYear, setFormYear] = useState("");
  const [formType, setFormType] = useState<ElectionType>(
    "PRESIDENTIAL_GENERAL"
  );
  const [formActive, setFormActive] = useState(true);

  const [ballotSparePercent, setBallotSparePercent] = useState<number | "">("");
  const [enforceBallotsGteRegistered, setEnforceBallotsGteRegistered] =
    useState<boolean>(true);

  /** List query */
  const electionsQ = useQuery({
    queryKey: ["elections", page, q, year, type, statusFilter],
    queryFn: () =>
      searchElections({
        page,
        size,
        q: q.trim() || undefined,
        year: toIntOrUndef(year),
        type: type || undefined,
        active: activeBool,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const elections = useMemo(
    () => electionsQ.data?.items ?? [],
    [electionsQ.data]
  );
  const totalPages = Math.max(1, electionsQ.data?.totalPages ?? 1);

  const refreshNow = async () => {
    await qc.invalidateQueries({ queryKey: ["elections"] });
    await electionsQ.refetch();
  };

  /** CRUD mutations */
  const createM = useMutation({
    mutationFn: async () => {
      const name = normalizeName(electionName);
      const y = toIntOrUndef(formYear);
      if (!name) throw new Error("Election name is required.");
      if (!y) throw new Error("Year is required.");

      const spare =
        ballotSparePercent === "" ? null : Number(ballotSparePercent);
      if (spare != null) {
        if (!Number.isFinite(spare)) throw new Error("Spare percent is invalid.");
        if (spare < 0 || spare > 100)
          throw new Error("Spare percent must be between 0 and 100.");
      }

      return createElection({
        electionName: name,
        year: y,
        electionType: formType,
        isActive: !!formActive,

        ballotSparePercent: spare,
        enforceBallotsGteRegistered,
      } as any);
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setElectionName("");
      setFormYear("");
      setFormType("PRESIDENTIAL_GENERAL");
      setFormActive(true);

      setBallotSparePercent("");
      setEnforceBallotsGteRegistered(true);

      setTouched(false);
      await refreshNow();
    },
  });

  const updateM = useMutation({
    mutationFn: async () => {
      if (!editing) throw new Error("No election selected.");
      const name = normalizeName(electionName);
      const y = toIntOrUndef(formYear);
      if (!name) throw new Error("Election name is required.");
      if (!y) throw new Error("Year is required.");

      const spare =
        ballotSparePercent === "" ? null : Number(ballotSparePercent);
      if (spare != null) {
        if (!Number.isFinite(spare)) throw new Error("Spare percent is invalid.");
        if (spare < 0 || spare > 100)
          throw new Error("Spare percent must be between 0 and 100.");
      }

      return updateElection(editing.electionId, {
        electionName: name,
        year: y,
        electionType: formType,
        isActive: !!formActive,

        ballotSparePercent: spare,
        enforceBallotsGteRegistered,
      } as any);
    },
    onSuccess: async () => {
      setOpen(false);
      setEditing(null);
      setElectionName("");
      setFormYear("");
      setFormType("PRESIDENTIAL_GENERAL");
      setFormActive(true);

      setBallotSparePercent("");
      setEnforceBallotsGteRegistered(true);

      setTouched(false);
      await refreshNow();
    },
  });

  const setActiveM = useMutation({
    mutationFn: async (e: ElectionDto) =>
      setElectionActive(e.electionId, !e.isActive),
    onSuccess: refreshNow,
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => deleteElection(id),
    onSuccess: refreshNow,
  });

  const saving = createM.isPending || updateM.isPending;

  /** Modal helpers */
  const openCreate = () => {
    setEditing(null);
    setElectionName("");
    setFormYear("");
    setFormType("PRESIDENTIAL_GENERAL");
    setFormActive(true);

    setBallotSparePercent("");
    setEnforceBallotsGteRegistered(true);

    setTouched(false);
    setOpen(true);
  };

  const openEdit = (e: ElectionDto) => {
    setEditing(e);
    setElectionName(safeStr(e.electionName));
    setFormYear(String(e.year ?? ""));
    setFormType(e.electionType || "PRESIDENTIAL_GENERAL");
    setFormActive(!!e.isActive);

    setBallotSparePercent(
      (e as any).ballotSparePercent == null
        ? ""
        : Number((e as any).ballotSparePercent)
    );
    setEnforceBallotsGteRegistered(
      (e as any).enforceBallotsGteRegistered ?? true
    );

    setTouched(false);
    setOpen(true);
  };

  const save = () => {
    setTouched(true);
    if (!canEdit) return;
    if (editing) updateM.mutate();
    else createM.mutate();
  };

  /** Table rows */
  const rows = useMemo(() => {
    return elections.map((e) => {
      const typeLabel =
        ELECTION_TYPE_OPTIONS.find((x) => x.value === e.electionType)?.label ||
        safeStr(e.electionType);

      const created =
        (e as any).dateCreated ??
        (e as any).createdAt ??
        (e as any).createdOn ??
        (e as any).date_created;

      const spare = (e as any).ballotSparePercent;
      const enforce = (e as any).enforceBallotsGteRegistered;

      const spareNode =
        spare == null || spare === ""
          ? <span className="text-slate-400">—</span>
          : <span className="font-bold">{Number(spare)}%</span>;

      const ruleNode = (
        <span
          className={`text-base font-extrabold px-2 py-1 rounded-lg border ${
            enforce === false
              ? "border-slate-200 text-slate-500 bg-white"
              : "border-emerald-200 text-emerald-700 bg-emerald-50"
          }`}
          title="Election-level rule: ballotsIssued must be >= registeredVoters"
        >
          {enforce === false ? "OFF" : "ENFORCED"}
        </span>
      );

      const statusNode = (
        <label className="inline-flex items-center gap-2 select-none">
          <input
            type="checkbox"
            checked={!!e.isActive}
            disabled={!canEdit || setActiveM.isPending}
            onChange={() => {
              if (!canEdit) return;
              setActiveM.mutate(e);
            }}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-bold">
            {e.isActive ? "ACTIVE" : "INACTIVE"}
          </span>
        </label>
      );

      const actions = (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="px-5 py-1.5 rounded-lg border border-slate-200 bg-blue-800 text-lg text-white font-bold"
            title="Open election workspace"
            onClick={() => nav(`/elections/${e.electionId}/overview`)}
          >
            Open
          </button>

          <button
            type="button"
            disabled={!canEdit || setActiveM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit || setActiveM.isPending ? "opacity-60" : ""
            }`}
            title={
              canEdit
                ? e.isActive
                  ? "Deactivate election (SYSTEM/NEC)"
                  : "Activate election (SYSTEM/NEC)"
                : "Read-only (Tenant)"
            }
            onClick={() => setActiveM.mutate(e)}
          >
            {e.isActive ? (
              <PowerOff size={24} className="text-amber-600" />
            ) : (
              <Power size={24} className="text-emerald-600" />
            )}
          </button>

          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-700 ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit election (SYSTEM/NEC)" : "Read-only (Tenant)"}
            onClick={() => openEdit(e)}
          >
            <Pencil size={24} />
          </button>

          <button
            type="button"
            disabled={!canEdit || deleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 ${
              !canEdit || deleteM.isPending ? "opacity-60" : ""
            }`}
            title={
              canEdit
                ? "Delete election permanently (SYSTEM/NEC)"
                : "Read-only (Tenant)"
            }
            onClick={() => {
              const ok = window.confirm(
                `Delete election "${e.electionName}" (${e.year})?\nThis is permanent.`
              );
              if (ok) deleteM.mutate(e.electionId);
            }}
          >
            <Trash2 size={24} className="text-red-600" />
          </button>
        </div>
      );

      return [
        e.electionName,
        e.year,
        typeLabel,
        spareNode,
        ruleNode,
        statusNode,
        fmtDate(created),
        actions,
      ];
    });
  }, [elections, nav, canEdit, setActiveM.isPending, deleteM.isPending]);

  return (
    <div className="flex flex-col gap-4 text-xl">
      <SectionTitle
        title="Elections"
        subtitle="Official elections (global). Tenants can view read-only; NEC/SYSTEM can manage elections."
      />

      <Panel
        title="Elections List"
        right={
          <div className="flex items-center gap-2">
            {canEdit ? (
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-blue-700 text-xl text-white font-bold"
                title="Create new election (SYSTEM/NEC)"
              >
                <Plus size={16} />
                New Election
              </button>
            ) : (
              <Badge text="Read-only (Tenant)" />
            )}

            <button
              type="button"
              onClick={refreshNow}
              disabled={electionsQ.isFetching}
              className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-blue-100 ${
                electionsQ.isFetching ? "opacity-60" : ""
              }`}
              title="Refresh elections"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        }
      >
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
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
              placeholder="Search election name…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-240px outline-none"
            />
          </div>

          <input
            value={year}
            onChange={(e) => {
              setYear(e.target.value);
              setPage(0);
            }}
            placeholder="Year (e.g., 2029)"
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white w-150px outline-none"
            title="Filter by year"
          />

          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value as any);
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white outline-none"
            title="Filter by election type"
          >
            <option value="">All Types</option>
            {ELECTION_TYPE_OPTIONS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>

          <div
            className="inline-flex items-center gap-3 px-3 py-2 rounded-lg border border-slate-200 bg-white"
            title="Filter by status"
          >
            <span className="text-lg font-extrabold text-slate-600">
              Status:
            </span>

            <label className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="election-status"
                checked={statusFilter === "active"}
                onChange={() => {
                  setStatusFilter("active");
                  setPage(0);
                }}
              />
              <span className="text-lg">Active</span>
            </label>

            <label className="inline-flex items-center gap-1.5 text-sm">
              <input
                type="radio"
                name="election-status"
                checked={statusFilter === "inactive"}
                onChange={() => {
                  setStatusFilter("inactive");
                  setPage(0);
                }}
              />
              <span className="text-lg">Inactive</span>
            </label>

            <label className="inline-flex items-center gap-1.5 text-base">
              <input
                type="radio"
                name="election-status"
                checked={statusFilter === "all"}
                onChange={() => {
                  setStatusFilter("all");
                  setPage(0);
                }}
              />
              <span className="text-lg">All</span>
            </label>
          </div>

          <button
            type="button"
            onClick={() => {
              setQ("");
              setYear("");
              setType("");
              setStatusFilter("active");
              setPage(0);
            }}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
            title="Clear filters"
          >
            Clear
          </button>
        </div>

        {/* Status */}
        {electionsQ.isLoading ? (
          <div className="p-2 text-slate-600">Loading elections…</div>
        ) : electionsQ.isError ? (
          <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 mb-2">
            {(electionsQ.error as any)?.message ?? "Failed to load elections."}
          </div>
        ) : null}

        {/* Table */}
        <SimpleTable
          columns={[
            "Election",
            "Year",
            "Type",
            "Spare %",
            "Rule",
            "Status",
            "Date Created",
            "Actions",
          ]}
          rows={
            rows.length
              ? rows
              : [
                  [
                    <span key="empty" className="text-slate-500">
                      No elections found.
                    </span>,
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                    "",
                  ],
                ]
          }
        />

        {/* Pagination */}
        <div className="mt-3 flex justify-between gap-2">
          <div className="text-sm text-slate-500">
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

        <div className="mt-3 text-lg">
          <PlaceholderNote
            title="Behavior"
            bullets={[
              "Default view shows Active elections only (use Status radio to switch).",
              "Tenants can view elections read-only.",
              "NEC/SYSTEM can Create, Edit, Activate/Deactivate, and Delete.",
              "Spare % and Rule are election-level NEC ballot policies (used during allocations).",
              "Click Open to enter election workspace (/elections/:id/overview).",
            ]}
          />
        </div>
      </Panel>

      {/* CREATE/EDIT MODAL */}
      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (saving) return;
            setOpen(false);
          }}
        />
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER WITH BLUE GRADIENT */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-6 py-5 sm:py-6 border-b border-blue-600 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                  {editing ? "✏️ Edit Election" : "🗳️ Create Election"}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-blue-100 mt-1">
                  {editing
                    ? "Update election master data and ballot policies."
                    : "Create a new official election."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex-shrink-0 h-9 w-9 rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white flex items-center justify-center disabled:opacity-50"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-5">
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-base font-semibold text-slate-900 mb-2">
                    Election Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={electionName}
                    onChange={(e) => {
                      setElectionName(e.target.value);
                      setTouched(true);
                    }}
                    placeholder="e.g., Presidential General"
                    className={`w-full rounded-lg border px-3 py-2.5 text-lg outline-none transition ${
                      touched && !normalizeName(electionName)
                        ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:ring-2 focus:ring-red-400"
                        : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                    }`}
                  />
                  {touched && !normalizeName(electionName) && (
                    <div className="text-xs text-red-600 font-semibold mt-1">⚠️ Required</div>
                  )}
                </div>

                {/* Row: Year & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-base font-semibold text-slate-900 mb-2">
                      Year <span className="text-red-600">*</span>
                    </label>
                    <input
                      value={formYear}
                      onChange={(e) => {
                        setFormYear(e.target.value);
                        setTouched(true);
                      }}
                      placeholder="e.g., 2029"
                      className={`w-full rounded-lg border px-3 py-2.5 text-lg outline-none transition ${
                        touched && !toIntOrUndef(formYear)
                          ? "border-red-300 bg-red-50 text-red-900 placeholder:text-red-400 focus:ring-2 focus:ring-red-400"
                          : "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                      }`}
                    />
                    {touched && !toIntOrUndef(formYear) && (
                      <div className="text-xs text-red-600 font-semibold mt-1">⚠️ Required</div>
                    )}
                  </div>

                  <div>
                    <label className="block text-base font-semibold text-slate-900 mb-2">
                      Type <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => {
                        setFormType(e.target.value as any);
                        setTouched(true);
                      }}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-slate-900"
                    >
                      {ELECTION_TYPE_OPTIONS.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active */}
                <label className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={formActive}
                    onChange={(e) => {
                      setFormActive(e.target.checked);
                      setTouched(true);
                    }}
                    className="h-4 w-4 accent-blue-600"
                  />
                  <span className="text-sm font-semibold text-slate-900">Active</span>
                </label>

                {/* Ballot Policy */}
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                  <div className="text-sm font-bold text-blue-900 mb-1 uppercase tracking-wide">
                    🎫 Ballot Policy (NEC)
                  </div>
                  <p className="text-xs text-blue-800 mb-4">
                    Configure spare ballot percent and enforcement rule for allocations.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Spare Ballots Percent
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ballotSparePercent}
                        onChange={(e) => {
                          const v = e.target.value;
                          setTouched(true);
                          if (v === "") return setBallotSparePercent("");
                          const n = Number(v);
                          if (!Number.isFinite(n)) return;
                          setBallotSparePercent(n);
                        }}
                        placeholder="e.g., 20"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg outline-none focus:ring-2 focus:ring-blue-500 transition bg-white text-slate-900 placeholder:text-slate-400"
                      />
                      <div className="text-xs text-slate-600 mt-1 font-semibold">
                        Optional. Leave empty if not set yet.
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-900 mb-2">
                        Enforce ballotsIssued ≥ registeredVoters
                      </label>

                      <div className="flex items-center gap-4">
                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="enforceBallotsGteRegistered"
                            checked={enforceBallotsGteRegistered === true}
                            onChange={() => {
                              setTouched(true);
                              setEnforceBallotsGteRegistered(true);
                            }}
                            className="h-4 w-4 accent-green-600"
                          />
                          <span className="font-semibold">Yes</span>
                        </label>

                        <label className="inline-flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="enforceBallotsGteRegistered"
                            checked={enforceBallotsGteRegistered === false}
                            onChange={() => {
                              setTouched(true);
                              setEnforceBallotsGteRegistered(false);
                            }}
                            className="h-4 w-4 accent-red-600"
                          />
                          <span className="font-semibold">No</span>
                        </label>
                      </div>

                      <div className="text-xs text-slate-600 mt-1 font-semibold">
                        Recommended: <span className="text-green-700">Yes</span> (prevent shortage)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Errors */}
                {createM.isError || updateM.isError ? (
                  <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-semibold">
                    ⚠️ {createM.isError
                      ? friendlySaveError(createM.error)
                      : friendlySaveError(updateM.error)}
                  </div>
                ) : null}
              </div>
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={saving}
                className="px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={save}
                disabled={!canEdit || saving}
                className={`px-4 h-10 rounded-lg text-sm font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || saving
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                {saving ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} className="text-red-500" />
                    <span className="hidden sm:inline">
                      {editing ? "Update" : "Create"}
                    </span>
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

