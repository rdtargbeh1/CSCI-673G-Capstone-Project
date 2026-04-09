// src/pages/elections/workspace/tabs/setup/election/ContestsTab.tsx
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

  // ----------------- Counties + Districts -----------------
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

  // ----------------- Contests -----------------
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

  const refreshNow = async () => {
    await qc.invalidateQueries({
      queryKey: ["contests-by-election", electionId],
    });
    await contestsQ.refetch();
  };

  /** -------- Contest modal open helpers -------- */
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

  /** -------- Mutations -------- */
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

  // ✅ Activate/Deactivate contest (button in Actions)
  const contestToggleActiveM = useMutation({
    mutationFn: async (c: ContestDto) => {
      return updateContest(c.contestId, {
        isActive: !boolVal(c.isActive, true),
      });
    },
    onSuccess: refreshNow,
  });

  const savingContest = contestCreateM.isPending || contestUpdateM.isPending;

  /** -------- Table rows -------- */
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
            className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            title="Open contest options"
            onClick={() => onOpenOptions(c.contestId)}
          >
            <List size={16} />
            <span className="text-xs font-bold">Options</span>
          </button>

          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
            title={canEdit ? "Edit contest (SYSTEM/NEC)" : "Read-only"}
            onClick={() => openEditContest(c)}
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            disabled={!canEdit || contestToggleActiveM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit || contestToggleActiveM.isPending ? "opacity-60" : ""
            }`}
            title={activeVal ? "Deactivate contest" : "Activate contest"}
            onClick={() => contestToggleActiveM.mutate(c)}
          >
            <Power size={16} />
            <span className="text-xs font-bold">
              {activeVal ? "Deactivate" : "Activate"}
            </span>
          </button>

          <button
            type="button"
            disabled={!canEdit || contestDeleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 ${
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
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <div key={c.contestId} className="grid">
          <span className="font-bold">{c.contestName}</span>
          <span className="text-[11px] text-slate-500">
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
          className={`text-xs font-bold ${
            activeVal ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {activeVal ? "ACTIVE" : "INACTIVE"}
        </span>,
        <span key="created" className="text-xs text-slate-600">
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

  /** -------- Guard -------- */
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

  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Election setup is managed by NEC/System Admin. You can view contests read-only."
          sources={["contest"]}
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
              placeholder="Search contests…"
              className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white min-w-[260px] outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setQ("")}
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
              onClick={openCreateContest}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
              title="Create contest (SYSTEM/NEC)"
            >
              <Plus size={16} />
              Create Contest
            </button>
          ) : (
            <Badge text="Read-only (Tenant)" />
          )}

          <button
            type="button"
            onClick={refreshNow}
            disabled={contestsQ.isFetching}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              contestsQ.isFetching ? "opacity-60" : ""
            }`}
            title="Refresh contests"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </div>

      {contestsQ.isLoading ? (
        <div className="p-2 text-slate-600">Loading contests…</div>
      ) : contestsQ.isError ? (
        <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
          {(contestsQ.error as any)?.message ?? "Failed to load contests."}
        </div>
      ) : null}

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

      {/* ---------------- Contest Modal ---------------- */}
      {contestOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => {
            if (savingContest) return;
            setContestOpen(false);
          }}
        >
          <div
            className="w-full max-w-[860px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-base">
                  {contestEditing ? "Edit Contest" : "Create Contest"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {contestEditing
                    ? "Update contest data."
                    : "Create a new contest for this election."}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setContestOpen(false)}
                disabled={savingContest}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  savingContest ? "opacity-60" : ""
                }`}
              >
                Close
              </button>
            </div>

            <div className="grid gap-2.5 mt-3">
              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Contest Name <span className="text-red-600">*</span>
                </div>
                <input
                  value={contestName}
                  onChange={(e) => {
                    setContestName(e.target.value);
                    setContestTouched(true);
                  }}
                  className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                />
                {contestTouched && !normalizeName(contestName) ? (
                  <div className="text-[11px] font-bold text-red-600">
                    Required
                  </div>
                ) : null}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Category
                  </div>
                  <select
                    value={category}
                    onChange={(e) =>
                      setCategory(e.target.value as ContestCategory)
                    }
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white"
                  >
                    {CATEGORIES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Scope
                  </div>
                  <select
                    value={scopeType}
                    onChange={(e) => {
                      setScopeType(e.target.value as ContestScopeType);
                      setContestTouched(true);
                    }}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white"
                  >
                    {SCOPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Vote Method
                  </div>
                  <select
                    value={voteMethod}
                    onChange={(e) =>
                      setVoteMethod(e.target.value as ContestVoteMethod)
                    }
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white"
                  >
                    {VOTE_METHODS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    County{" "}
                    {scopeType === "COUNTY" || scopeType === "DISTRICT" ? (
                      <span className="text-red-600">*</span>
                    ) : null}
                  </div>

                  <select
                    value={countyId}
                    onChange={(e) => {
                      setCountyId(e.target.value);
                      setContestTouched(true);
                      if (scopeType === "DISTRICT") setDistrictId("");
                    }}
                    disabled={scopeType === "NATIONAL"}
                    className={`px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white ${
                      scopeType === "NATIONAL" ? "opacity-60" : ""
                    }`}
                  >
                    <option value="">
                      {scopeType === "NATIONAL"
                        ? "Not used for NATIONAL"
                        : countiesQ.isLoading
                        ? "Loading counties…"
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
                  !countyId.trim() ? (
                    <div className="text-[11px] font-bold text-red-600">
                      County is required for COUNTY/DISTRICT scope
                    </div>
                  ) : null}
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    District{" "}
                    {scopeType === "DISTRICT" ? (
                      <span className="text-red-600">*</span>
                    ) : null}
                  </div>

                  <select
                    value={districtId}
                    onChange={(e) => {
                      setDistrictId(e.target.value);
                      setContestTouched(true);
                    }}
                    disabled={scopeType !== "DISTRICT" || !countyId.trim()}
                    className={`px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white ${
                      scopeType !== "DISTRICT" || !countyId.trim()
                        ? "opacity-60"
                        : ""
                    }`}
                  >
                    <option value="">
                      {scopeType !== "DISTRICT"
                        ? "Only used for DISTRICT scope"
                        : !countyId.trim()
                        ? "Select county first…"
                        : districtsQ.isLoading
                        ? "Loading districts…"
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
                  !districtId.trim() ? (
                    <div className="text-[11px] font-bold text-red-600">
                      District is required for DISTRICT scope
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Seats
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={seats}
                    onChange={(e) => setSeats(Number(e.target.value || 1))}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                  />
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Max Selections
                  </div>
                  <input
                    type="number"
                    min={1}
                    value={maxSelections}
                    onChange={(e) =>
                      setMaxSelections(Number(e.target.value || 1))
                    }
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                  />
                  <div className="text-[11px] text-slate-500">
                    Must be ≥ seats (backend enforces).
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Status
                  </div>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as ContestStatus)}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white"
                  >
                    {STATUSES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-500">
                    If LOCKED, backend blocks structural changes.
                  </div>
                </div>
              </div>

              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Active
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={contestActive}
                    onChange={(e) => setContestActive(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Active
                </label>
              </div>

              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Description
                </div>
                <textarea
                  value={contestDesc}
                  onChange={(e) => setContestDesc(e.target.value)}
                  rows={3}
                  className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                />
              </div>

              {contestCreateM.isError || contestUpdateM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {contestCreateM.isError
                    ? friendlySaveError(contestCreateM.error)
                    : friendlySaveError(contestUpdateM.error)}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setContestOpen(false)}
                  disabled={savingContest}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    savingContest ? "opacity-60" : ""
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canEdit || savingContest}
                  onClick={() => {
                    setContestTouched(true);
                    if (!canEdit) return;
                    if (contestEditing) contestUpdateM.mutate();
                    else contestCreateM.mutate();
                  }}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || savingContest ? "opacity-60" : ""
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
