
// // src/pages/elections/workspace/tabs/setup/election/ContestsTab.tsx

import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Power,
  List,
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
  createContest,
  deleteContest,
  listContestsByElection,
  updateContest,
} from "../../../../../../shared/services/contestService";

import type {
  ContestDto,
  ContestVoteMethod,
  ContestCategory,
  ContestScopeType,
  ContestStatus,
} from "../../../../../../auth/contestTypes";

import {
  fetchCounties,
  type CountyDto,
} from "../../../../../../shared/services/countyService";
import {
  fetchDistricts,
  type DistrictDto,
} from "../../../../../../shared/services/districtService";

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
    "Failed to save.";
  return msg;
}

function boolVal(v: any, fallback = false) {
  return v == null ? fallback : Boolean(v);
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

/** ---- enums for selects ---- */
const VOTE_METHODS: ContestVoteMethod[] = [
  "SINGLE_CHOICE",
  "MULTI_CHOICE",
  "RANKED",
];
const CATEGORIES: ContestCategory[] = [
  "PRESIDENT",
  "SENATE",
  "REPRESENTATIVE",
  "REFERENDUM",
  "OTHER",
];
const SCOPES: ContestScopeType[] = ["NATIONAL", "COUNTY", "DISTRICT"];
const STATUSES: ContestStatus[] = ["DRAFT", "PUBLISHED", "LOCKED", "ARCHIVED"];

type Props = {
  onOpenOptions: (contestId: string) => void;
};

/** ============ MAIN COMPONENT ============ */
export default function ContestsTab({ onOpenOptions }: Props) {
  const qc = useQueryClient();
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  // filters
  const [q, setQ] = useState("");

  // selection
  const [selected, setSelected] = useState<ContestDto | null>(null);

  // contest modal
  const [contestOpen, setContestOpen] = useState(false);
  const [contestEditing, setContestEditing] = useState<ContestDto | null>(null);
  const [contestTouched, setContestTouched] = useState(false);

  // contest fields
  const [contestName, setContestName] = useState("");
  const [category, setCategory] = useState<ContestCategory>("OTHER");
  const [scopeType, setScopeType] = useState<ContestScopeType>("NATIONAL");
  const [countyId, setCountyId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [voteMethod, setVoteMethod] =
    useState<ContestVoteMethod>("SINGLE_CHOICE");
  const [seats, setSeats] = useState<number>(1);
  const [maxSelections, setMaxSelections] = useState<number>(1);
  const [status, setStatus] = useState<ContestStatus>("DRAFT");
  const [contestDesc, setContestDesc] = useState("");
  const [contestActive, setContestActive] = useState(true);

  /** ============ COUNTIES + DISTRICTS ============ */
  const COUNTY_PAGE_SIZE = 200;
  const DISTRICT_PAGE_SIZE = 500;

  const countiesQ = useQuery({
    queryKey: ["counties", "all-active-for-contest"],
    queryFn: () => fetchCounties({ page: 0, size: COUNTY_PAGE_SIZE, q: "" }),
    staleTime: 60_000,
    retry: 1,
  });

  const counties: CountyDto[] = useMemo(
    () => countiesQ.data?.items ?? [],
    [countiesQ.data]
  );

  const districtsQ = useQuery({
    enabled: scopeType === "DISTRICT" && Boolean(countyId.trim()),
    queryKey: ["districts", "by-county-for-contest", countyId.trim()],
    queryFn: () =>
      fetchDistricts({
        page: 0,
        size: DISTRICT_PAGE_SIZE,
        q: "",
        countyId: countyId.trim() || undefined,
      }),
    staleTime: 60_000,
    retry: 1,
  });

  const districts: DistrictDto[] = useMemo(
    () => districtsQ.data?.items ?? [],
    [districtsQ.data]
  );

  React.useEffect(() => {
    if (scopeType === "NATIONAL") {
      setCountyId("");
      setDistrictId("");
    } else if (scopeType === "COUNTY") {
      setDistrictId("");
    }
  }, [scopeType]);

  React.useEffect(() => {
    if (scopeType === "DISTRICT") setDistrictId("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countyId]);

  /** ============ CONTESTS ============ */
  const contestsQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: ["contests-by-election", electionId],
    queryFn: () => listContestsByElection(electionId!),
    staleTime: 10_000,
    retry: 1,
  });

  const contestsAll = useMemo(() => contestsQ.data ?? [], [contestsQ.data]);

  const contests = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return contestsAll;
    return contestsAll.filter((c) => {
      const a = safeStr(c.contestName).toLowerCase();
      const b = safeStr(c.voteMethod).toLowerCase();
      const cc = safeStr(c.category).toLowerCase();
      const s = safeStr(c.scopeType).toLowerCase();
      const d = safeStr(c.description).toLowerCase();
      return (
        a.includes(term) ||
        b.includes(term) ||
        cc.includes(term) ||
        s.includes(term) ||
        d.includes(term)
      );
    });
  }, [contestsAll, q]);

  React.useEffect(() => {
    if (!selected) return;
    const still = contestsAll.find((x) => x.contestId === selected.contestId);
    if (!still) setSelected(null);
    else setSelected(still);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contestsAll]);

  /** ============ HANDLERS (BEFORE MUTATIONS) ============ */
  const refreshNow = async () => {
    await qc.invalidateQueries({
      queryKey: ["contests-by-election", electionId],
    });
    await contestsQ.refetch();
  };

  const openCreateContest = () => {
    setContestEditing(null);
    setContestName("");
    setCategory("OTHER");
    setScopeType("NATIONAL");
    setCountyId("");
    setDistrictId("");
    setVoteMethod("SINGLE_CHOICE");
    setSeats(1);
    setMaxSelections(1);
    setStatus("DRAFT");
    setContestDesc("");
    setContestActive(true);
    setContestTouched(false);
    setContestOpen(true);
  };

  const openEditContest = (c: ContestDto) => {
    setContestEditing(c);
    setContestName(safeStr(c.contestName));
    setCategory(c.category ?? "OTHER");
    setScopeType(c.scopeType ?? "NATIONAL");
    setCountyId(safeStr(c.countyId ?? ""));
    setDistrictId(safeStr(c.districtId ?? ""));
    setVoteMethod(c.voteMethod ?? "SINGLE_CHOICE");
    setSeats(Number(c.seats ?? 1));
    setMaxSelections(Number(c.maxSelections ?? c.seats ?? 1));
    setStatus(c.status ?? "DRAFT");
    setContestDesc(safeStr(c.description));
    setContestActive(boolVal(c.isActive, true));
    setContestTouched(false);
    setContestOpen(true);
  };

  /** ============ MUTATIONS ============ */
  const contestCreateM = useMutation({
    mutationFn: async () => {
      if (!electionId) throw new Error("Missing electionId.");
      const name = normalizeName(contestName);
      if (!name) throw new Error("Contest name is required.");

      const payloadCounty =
        scopeType === "COUNTY" || scopeType === "DISTRICT"
          ? countyId.trim() || null
          : null;
      const payloadDistrict =
        scopeType === "DISTRICT" ? districtId.trim() || null : null;

      if (scopeType === "COUNTY" && !payloadCounty)
        throw new Error("countyId is required for COUNTY scope.");
      if (scopeType === "DISTRICT" && !payloadDistrict)
        throw new Error("districtId is required for DISTRICT scope.");

      const s = Number(seats || 1);
      const ms = Number(maxSelections || s || 1);

      return createContest({
        electionId,
        contestName: name,
        category,
        scopeType,
        countyId: payloadCounty,
        districtId: payloadDistrict,
        voteMethod,
        seats: s,
        maxSelections: Math.max(ms, s),
        description: contestDesc.trim() || null,
        status,
        isActive: contestActive,
      });
    },
    onSuccess: async (created) => {
      setContestOpen(false);
      setContestEditing(null);
      await refreshNow();
      setSelected(created);
    },
  });

  const contestUpdateM = useMutation({
    mutationFn: async () => {
      if (!contestEditing) throw new Error("No contest selected.");
      const name = normalizeName(contestName);
      if (!name) throw new Error("Contest name is required.");

      const payloadCounty =
        scopeType === "COUNTY" || scopeType === "DISTRICT"
          ? countyId.trim() || null
          : null;
      const payloadDistrict =
        scopeType === "DISTRICT" ? districtId.trim() || null : null;

      if (scopeType === "COUNTY" && !payloadCounty)
        throw new Error("countyId is required for COUNTY scope.");
      if (scopeType === "DISTRICT" && !payloadDistrict)
        throw new Error("districtId is required for DISTRICT scope.");

      const s = Number(seats || 1);
      const ms = Number(maxSelections || s || 1);

      return updateContest(contestEditing.contestId, {
        contestName: name,
        category,
        scopeType,
        countyId: payloadCounty,
        districtId: payloadDistrict,
        voteMethod,
        seats: s,
        maxSelections: Math.max(ms, s),
        description: contestDesc.trim() || null,
        status,
        isActive: contestActive,
      });
    },
    onSuccess: async (updated) => {
      setContestOpen(false);
      setContestEditing(null);
      await refreshNow();
      setSelected(updated);
    },
  });

  const contestDeleteM = useMutation({
    mutationFn: async (contestId: string) => deleteContest(contestId),
    onSuccess: async () => {
      setSelected(null);
      await refreshNow();
    },
  });

  const contestToggleActiveM = useMutation({
    mutationFn: async (c: ContestDto) => {
      return updateContest(c.contestId, {
        isActive: !boolVal(c.isActive, true),
      });
    },
    onSuccess: refreshNow,
  });

  /** ============ STATE ============ */
  const savingContest = contestCreateM.isPending || contestUpdateM.isPending;

  /** ============ TABLE ROWS ============ */
  const selectedRowIndex = useMemo(() => {
    if (!selected) return -1;
    return contests.findIndex((x) => x.contestId === selected.contestId);
  }, [contests, selected]);

  const countyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of counties) m.set(c.countyId, c.countyName);
    return m;
  }, [counties]);

  const districtNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of districts) m.set(d.districtId, d.districtName);
    return m;
  }, [districts]);

  const contestRows = useMemo(() => {
    return contests.map((c) => {
      const activeVal = boolVal(c.isActive, true);

      const scopeMeta =
        c.scopeType === "NATIONAL"
          ? "—"
          : c.scopeType === "COUNTY"
          ? `county: ${
              c.countyId ? countyNameById.get(c.countyId) ?? c.countyId : "—"
            }`
          : `district: ${
              c.districtId
                ? districtNameById.get(c.districtId) ?? c.districtId
                : "—"
            }`;

      const actions = (
        <div
          className="flex flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
            title="Open contest options"
            onClick={() => onOpenOptions(c.contestId)}
          >
            <List size={18} />
            <span className="text-base font-bold">Options</span>
          </button>

          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-800 hover:bg-green-50 transition ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit contest (SYSTEM/NEC)" : "Read-only"}
            onClick={() => openEditContest(c)}
          >
            <Pencil size={20} />
          </button>

          <button
            type="button"
            disabled={!canEdit || contestToggleActiveM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-blue-800 hover:bg-blue-50 transition ${
              !canEdit || contestToggleActiveM.isPending ? "opacity-60" : ""
            }`}
            title={activeVal ? "Deactivate contest" : "Activate contest"}
            onClick={() => contestToggleActiveM.mutate(c)}
          >
            <Power size={20} />
            <span className="text-xs font-bold">
              {activeVal ? "Deactivate" : "Activate"}
            </span>
          </button>

          <button
            type="button"
            disabled={!canEdit || contestDeleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 hover:bg-red-50 transition ${
              !canEdit || contestDeleteM.isPending ? "opacity-60" : ""
            }`}
            title={canEdit ? "Delete contest (SYSTEM/NEC)" : "Read-only"}
            onClick={() => {
              const ok = window.confirm(
                `Delete contest "${c.contestName}"?\nThis is permanent.`
              );
              if (ok) contestDeleteM.mutate(c.contestId);
            }}
          >
            <Trash2 size={20} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <div key={c.contestId} className="grid">
          <span className="font-bold">{c.contestName}</span>
          <span className="text-sm text-slate-500">
            {c.category} · {c.scopeType} · {scopeMeta}
          </span>
        </div>,
        <span key="vm" className="text-slate-700">
          {c.voteMethod}
        </span>,
        <span key="seats" className="text-slate-700">
          {c.seats}
        </span>,
        <span key="mx" className="text-slate-700">
          {c.maxSelections}
        </span>,
        <span key="st" className="text-slate-700">
          {c.status}
        </span>,
        <span
          key="active"
          className={`text-sm font-bold ${
            activeVal ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {activeVal ? "✅ ACTIVE" : "⚪ INACTIVE"}
        </span>,
        <span key="created" className="text-base text-slate-600">
          {fmtDate((c as any).dateCreated)}
        </span>,
        actions,
      ];
    });
  }, [
    contests,
    canEdit,
    contestDeleteM.isPending,
    contestToggleActiveM.isPending,
    countyNameById,
    districtNameById,
    onOpenOptions,
  ]);

  if (!electionId) {
    return (
      <div className="p-3 rounded-xl border border-slate-200 bg-white">
        <div className="font-extrabold text-slate-800">Contests</div>
        <div className="text-sm text-slate-600 mt-1">
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
          reason="Election setup is managed by NEC/System Admin. You can view contests read-only."
          sources={["contest"]}
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
              placeholder="Search contests…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[260px] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => setQ("")}
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
              onClick={openCreateContest}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
              title="Create contest (SYSTEM/NEC)"
            >
              <Plus size={16} className="text-red-500" />
              Create Contest
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={contestsQ.isFetching}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
              contestsQ.isFetching ? "opacity-60" : ""
            }`}
            title="Refresh contests"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {/* ============ STATUS ============ */}
      {contestsQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading contests…</div>
      ) : contestsQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(contestsQ.error as any)?.message ?? "Failed to load contests."}
        </div>
      ) : null}

      {/* ============ TABLE ============ */}
      <div>
        <CompactTable
          columns={[
            "Contest",
            "Vote",
            "Seats",
            "Max",
            "Status",
            "Active",
            "Created",
            "Actions",
          ]}
          rows={
            contestRows.length
              ? contestRows
              : [
                  [
                    <span key="empty" className="text-slate-500">
                      No contests found.
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
          onRowClick={(idx) => setSelected(contests[idx] ?? null)}
          selectedRowIndex={selectedRowIndex}
        />
      </div>

      {/* ============ NOTES ============ */}
      <div className="mt-1">
        <PlaceholderNote
          title="Notes"
          bullets={[
            "SYSTEM/NEC can create/edit/delete contests.",
            "Use the Options button to manage contest options on a separate page.",
            "For DISTRICT scope, select a county first to load/filter districts.",
            "If LOCKED, backend blocks structural changes.",
          ]}
        />
      </div>

      {/* ============ CREATE/EDIT MODAL (HORIZONTAL 2-COLUMN LAYOUT) ============ */}
      {contestOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (savingContest) return;
            setContestOpen(false);
          }}
        >
          <div
            className="w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ============ HEADER WITH BLUE GRADIENT ============ */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  {contestEditing ? (
                    <>
                      <Pencil size={28} className="text-white" />
                      Edit Contest
                    </>
                  ) : (
                    <>
                      <Plus size={28} className="text-red-500" />
                      Create Contest
                    </>
                  )}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  {contestEditing
                    ? `Update "${contestName}" contest data.`
                    : "Create a new contest for this election."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savingContest) return;
                  setContestOpen(false);
                }}
                disabled={savingContest}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white disabled:opacity-50"
                title="Close modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* ============ CONTENT - HORIZONTAL LAYOUT ============ */}
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
              {/* LEFT COLUMN - Basic Info */}
              <div className="w-full lg:w-1/2 px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4 border-b lg:border-b-0 lg:border-r border-slate-200">
                {/* Contest Name */}
                <div>
                  <label className="block text-sm font-bold text-slate-900 mb-1.5">
                    Contest Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={contestName}
                    onChange={(e) => {
                      setContestName(e.target.value);
                      setContestTouched(true);
                    }}
                    placeholder="e.g., Presidential Election"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  {contestTouched && !normalizeName(contestName) && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600 font-semibold">
                      <AlertCircle size={12} /> Required
                    </div>
                  )}
                </div>

                {/* Category + Vote Method */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) =>
                        setCategory(e.target.value as ContestCategory)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      {CATEGORIES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                      Vote Method
                    </label>
                    <select
                      value={voteMethod}
                      onChange={(e) =>
                        setVoteMethod(e.target.value as ContestVoteMethod)
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      {VOTE_METHODS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                    Scope
                  </label>
                  <select
                    value={scopeType}
                    onChange={(e) => {
                      setScopeType(e.target.value as ContestScopeType);
                      setContestTouched(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    {SCOPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                {/* County (if needed) */}
                {(scopeType === "COUNTY" || scopeType === "DISTRICT") && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                      County <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={countyId}
                      onChange={(e) => {
                        setCountyId(e.target.value);
                        setContestTouched(true);
                        if (scopeType === "DISTRICT") setDistrictId("");
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    >
                      <option value="">
                        {countiesQ.isLoading
                          ? "Loading…"
                          : "Select county…"}
                      </option>
                      {counties.map((c) => (
                        <option key={c.countyId} value={c.countyId}>
                          {c.countyName}
                        </option>
                      ))}
                    </select>
                    {contestTouched &&
                      (scopeType === "COUNTY" || scopeType === "DISTRICT") &&
                      !countyId.trim() && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600 font-semibold">
                          <AlertCircle size={12} /> Required
                        </div>
                      )}
                  </div>
                )}

                {/* District (if needed) */}
                {scopeType === "DISTRICT" && (
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                      District <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={districtId}
                      onChange={(e) => {
                        setDistrictId(e.target.value);
                        setContestTouched(true);
                      }}
                      disabled={!countyId.trim()}
                      className={`w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                        !countyId.trim() ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      <option value="">
                        {!countyId.trim()
                          ? "Select county first…"
                          : districtsQ.isLoading
                          ? "Loading…"
                          : "Select district…"}
                      </option>
                      {districts.map((d) => (
                        <option key={d.districtId} value={d.districtId}>
                          {d.districtName}
                        </option>
                      ))}
                    </select>
                    {contestTouched &&
                      scopeType === "DISTRICT" &&
                      !districtId.trim() && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-red-600 font-semibold">
                          <AlertCircle size={12} /> Required
                        </div>
                      )}
                  </div>
                )}

                {/* Active Status */}
                <div className="rounded-lg border border-slate-300 bg-slate-50 p-2.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={contestActive}
                      onChange={(e) => setContestActive(e.target.checked)}
                      className="h-4 w-4 accent-blue-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-900">
                      Active
                    </span>
                  </label>
                </div>
              </div>

              {/* RIGHT COLUMN - Advanced Settings */}
              <div className="w-full lg:w-1/2 px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
                {/* Seats + Max Selections */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                      Seats
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={seats}
                      onChange={(e) => setSeats(Number(e.target.value || 1))}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                      Max Select
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={maxSelections}
                      onChange={(e) =>
                        setMaxSelections(Number(e.target.value || 1))
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                    <p className="text-xs text-slate-500 mt-0.5">
                      Must be ≥ seats
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                    Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContestStatus)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    {STATUSES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-0.5">
                    If LOCKED, backend blocks changes
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-900 mb-1.5 uppercase tracking-wide">
                    Description
                  </label>
                  <textarea
                    value={contestDesc}
                    onChange={(e) => setContestDesc(e.target.value)}
                    rows={5}
                    placeholder="Describe this contest…"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                  />
                </div>

                {/* Error Message */}
                {(contestCreateM.isError || contestUpdateM.isError) && (
                  <div className="flex gap-2 rounded-lg bg-red-50 border border-red-200 p-2.5">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={16} />
                    <div className="text-xs text-red-700 font-semibold">
                      {contestCreateM.isError
                        ? friendlySaveError(contestCreateM.error)
                        : friendlySaveError(contestUpdateM.error)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ============ FOOTER ============ */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-6 py-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (savingContest) return;
                  setContestOpen(false);
                }}
                disabled={savingContest}
                className="px-4 h-9 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm font-semibold hover:bg-slate-50 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canEdit || savingContest || !normalizeName(contestName)}
                onClick={() => {
                  setContestTouched(true);
                  if (!canEdit) return;
                  if (contestEditing) contestUpdateM.mutate();
                  else contestCreateM.mutate();
                }}
                className={`px-4 h-9 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 ${
                  !canEdit || savingContest || !normalizeName(contestName)
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                {savingContest ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline text-xs">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={16} className="text-red-500" />
                    <span className="hidden sm:inline">
                      {contestEditing ? "Update" : "Create"}
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

