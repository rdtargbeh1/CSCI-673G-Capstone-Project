// src/pages/elections/workspace/tabs/setup/election/ContestOptionsPage.tsx
import React, { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Plus,
  Trash2,
  Pencil,
  Users,
  Search,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";
import {
  Panel,
  PlaceholderNote,
  Badge,
  ReadOnlyBanner,
} from "../../../../shared/elections-ui";

import {
  createOption,
  deleteOption,
  listOptionsByContest,
  updateOption,
  bulkAssignCandidates,
  type ContestOptionDto,
  type ContestOptionType,
} from "../../../../../../shared/services/contestOptionService";

import {
  fetchElectionCandidates,
  type ElectionCandidateDto,
} from "../../../../../../shared/services/electionCandidateService";

/** ---------------- helpers ---------------- */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
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

const OPTION_TYPES: ContestOptionType[] = ["CANDIDATE", "LABEL"];

type Props = {
  contestId: string | null;
  onBack: () => void;
};

export default function ContestOptionsPage({ contestId, onBack }: Props) {
  const qc = useQueryClient();
  const { electionId } = useParams<{ electionId: string }>();

  const dashboardMode = useAuthStore((s) => s.dashboardMode);
  const canEdit = dashboardMode === "NEC" || dashboardMode === "SYSTEM";

  const [onlyActiveOptions, setOnlyActiveOptions] = useState(true);

  // option modal
  const [optionOpen, setOptionOpen] = useState(false);
  const [optionEditing, setOptionEditing] = useState<ContestOptionDto | null>(
    null
  );
  const [optionTouched, setOptionTouched] = useState(false);

  // option fields
  const [optionType, setOptionType] = useState<ContestOptionType>("CANDIDATE");
  const [optionLabel, setOptionLabel] = useState("");
  const [optionOrder, setOptionOrder] = useState<number>(1);
  const [optionElectId, setOptionElectId] = useState("");
  const [optionActive, setOptionActive] = useState(true);

  // bulk assign modal
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkMode, setBulkMode] = useState<"ALL" | "MANUAL">("MANUAL");
  const [bulkReplace, setBulkReplace] = useState(false);
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);

  // candidates
  const electionCandidatesQ = useQuery({
    enabled: Boolean(electionId),
    queryKey: ["election-candidates", electionId],
    queryFn: () => fetchElectionCandidates(electionId!),
    staleTime: 30_000,
    retry: 1,
  });

  const electionCandidatesAll: ElectionCandidateDto[] = useMemo(
    () => electionCandidatesQ.data ?? [],
    [electionCandidatesQ.data]
  );

  const electionCandidatesFiltered = useMemo(() => {
    const term = bulkSearch.trim().toLowerCase();
    if (!term) return electionCandidatesAll;
    return electionCandidatesAll.filter((c) => {
      const n = safeStr(c.fullName).toLowerCase();
      const ab = safeStr(
        (c as any).partyAbbrev ?? (c as any).partyAbbr ?? c.partyAbbrev
      ).toLowerCase();
      const center = safeStr(c.centerName).toLowerCase();
      return n.includes(term) || ab.includes(term) || center.includes(term);
    });
  }, [electionCandidatesAll, bulkSearch]);

  const electIdToLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const ec of electionCandidatesAll) {
      const meta = [ec.partyAbbrev, ec.centerName].filter(Boolean).join(" · ");
      m.set(ec.electId, meta ? `${ec.fullName} (${meta})` : ec.fullName);
    }
    return m;
  }, [electionCandidatesAll]);

  // options list
  const optionsQ = useQuery({
    enabled: Boolean(contestId),
    queryKey: ["contest-options", contestId, onlyActiveOptions],
    queryFn: () =>
      listOptionsByContest({
        contestId: contestId!,
        onlyActive: onlyActiveOptions,
      }),
    staleTime: 5_000,
    retry: 1,
  });

  const options = useMemo(() => optionsQ.data ?? [], [optionsQ.data]);

  const refreshNow = async () => {
    if (!contestId) return;
    await qc.invalidateQueries({ queryKey: ["contest-options", contestId] });
    await optionsQ.refetch();
  };

  const openCreateOption = () => {
    if (!contestId) return;
    setOptionEditing(null);
    setOptionType("CANDIDATE");
    setOptionLabel("");
    setOptionOrder(Math.max(1, (options?.length ?? 0) + 1));
    setOptionElectId("");
    setOptionActive(true);
    setOptionTouched(false);
    setOptionOpen(true);
  };

  const openEditOption = (o: ContestOptionDto) => {
    setOptionEditing(o);
    setOptionType(o.optionType ?? "CANDIDATE");
    setOptionLabel(safeStr(o.optionLabel));
    setOptionOrder(Number(o.optionOrder ?? 1));
    setOptionElectId(safeStr(o.electId));
    setOptionActive(boolVal(o.isActive, true));
    setOptionTouched(false);
    setOptionOpen(true);
  };

  const openBulkAssign = () => {
    if (!contestId) return;
    setBulkMode("MANUAL");
    setBulkReplace(false);
    setBulkSearch("");
    setBulkSelected([]);
    setBulkOpen(true);
  };

  // mutations
  const optionCreateM = useMutation({
    mutationFn: async () => {
      if (!contestId) throw new Error("Missing contestId.");

      if (optionType === "CANDIDATE") {
        if (!optionElectId.trim())
          throw new Error("electId is required for CANDIDATE option.");
      } else {
        const label = normalizeName(optionLabel);
        if (!label)
          throw new Error("optionLabel is required for LABEL option.");
      }

      return createOption({
        contestId,
        optionType,
        optionOrder: Number(optionOrder || 1),
        isActive: optionActive,
        electId:
          optionType === "CANDIDATE" ? optionElectId.trim() || null : null,
        optionLabel:
          optionType === "LABEL" ? normalizeName(optionLabel) || null : null,
      });
    },
    onSuccess: async () => {
      setOptionOpen(false);
      setOptionEditing(null);
      await refreshNow();
    },
  });

  const optionUpdateM = useMutation({
    mutationFn: async () => {
      if (!optionEditing) throw new Error("No option selected.");

      if (optionType === "CANDIDATE") {
        if (!optionElectId.trim())
          throw new Error("electId is required for CANDIDATE option.");
      } else {
        const label = normalizeName(optionLabel);
        if (!label)
          throw new Error("optionLabel is required for LABEL option.");
      }

      return updateOption(optionEditing.optionId, {
        optionType,
        optionOrder: Number(optionOrder || 1),
        isActive: optionActive,
        electId:
          optionType === "CANDIDATE" ? optionElectId.trim() || null : null,
        optionLabel:
          optionType === "LABEL" ? normalizeName(optionLabel) || null : null,
      });
    },
    onSuccess: async () => {
      setOptionOpen(false);
      setOptionEditing(null);
      await refreshNow();
    },
  });

  const optionDeleteM = useMutation({
    mutationFn: async (optionId: string) => deleteOption(optionId),
    onSuccess: refreshNow,
  });

  const bulkAssignM = useMutation({
    mutationFn: async () => {
      if (!contestId) throw new Error("Missing contestId.");

      let electIds: string[] = [];
      if (bulkMode === "ALL") {
        electIds = electionCandidatesFiltered.map((x) => x.electId);
      } else {
        electIds = bulkSelected;
      }

      electIds = Array.from(new Set(electIds.filter(Boolean)));
      if (!electIds.length) throw new Error("No election candidates selected.");

      return bulkAssignCandidates({
        contestId,
        electIds,
        replace: bulkReplace,
      });
    },
    onSuccess: async () => {
      setBulkOpen(false);
      await refreshNow();
    },
  });

  const savingOption = optionCreateM.isPending || optionUpdateM.isPending;

  const optionRows = useMemo(() => {
    const sorted = [...options].sort(
      (a, b) => (a.optionOrder ?? 0) - (b.optionOrder ?? 0)
    );

    return sorted.map((o) => {
      const activeVal = boolVal(o.isActive, true);
      const displayValue =
        o.optionType === "CANDIDATE"
          ? o.electId
            ? electIdToLabel.get(o.electId) ?? o.electId
            : "—"
          : o.optionLabel ?? "—";

      const actions = (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canEdit}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
            onClick={() => openEditOption(o)}
            title={canEdit ? "Edit option" : "Read-only"}
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            disabled={!canEdit || optionDeleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 ${
              !canEdit || optionDeleteM.isPending ? "opacity-60" : ""
            }`}
            title={canEdit ? "Delete option" : "Read-only"}
            onClick={() => {
              const ok = window.confirm(
                `Delete option "${displayValue}"?\nThis is permanent.`
              );
              if (ok) optionDeleteM.mutate(o.optionId);
            }}
          >
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      );

      return [
        <span key="order" className="text-slate-700">
          {o.optionOrder ?? "—"}
        </span>,
        <span key="type" className="text-slate-700">
          {o.optionType}
        </span>,
        <span key="val" className="text-xs text-slate-700 break-words">
          {displayValue}
        </span>,
        <span
          key="act"
          className={`text-xs font-bold ${
            activeVal ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {activeVal ? "ACTIVE" : "INACTIVE"}
        </span>,
        actions,
      ];
    });
  }, [options, canEdit, optionDeleteM.isPending, electIdToLabel]);

  if (!contestId) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="font-extrabold text-slate-800">Contest Options</div>
        <div className="text-sm text-slate-600 mt-1">No contest selected.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Contest options are managed by NEC/System Admin. You can view options read-only."
          sources={["contest_option"]}
        />
      ) : null}

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white"
        >
          <ArrowLeft size={16} /> Back to Contests
        </button>

        <Badge text={`Contest: ${contestId}`} />

        <button
          type="button"
          onClick={refreshNow}
          disabled={optionsQ.isFetching}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white ${
            optionsQ.isFetching ? "opacity-60" : ""
          }`}
        >
          <RefreshCw size={16} /> Refresh
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={onlyActiveOptions}
              onChange={(e) => setOnlyActiveOptions(e.target.checked)}
              className="h-4 w-4 accent-emerald-600"
            />
            Only active
          </label>

          <button
            type="button"
            disabled={!canEdit}
            onClick={openCreateOption}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
          >
            <Plus size={16} />
            Add Option
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={openBulkAssign}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white ${
              !canEdit ? "opacity-60" : ""
            }`}
          >
            <Users size={16} />
            Bulk Assign
          </button>
        </div>
      </div>

      <Panel title="Contest Options">
        {optionsQ.isLoading ? (
          <div className="p-2 text-slate-600">Loading options…</div>
        ) : optionsQ.isError ? (
          <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700">
            {(optionsQ.error as any)?.message ?? "Failed to load options."}
          </div>
        ) : (
          <CompactTable
            columns={["Order", "Type", "Value", "Active", "Actions"]}
            rows={
              optionRows.length
                ? optionRows
                : [
                    [
                      <span key="empty2" className="text-slate-500">
                        No options found.
                      </span>,
                      "",
                      "",
                      "",
                      "",
                    ],
                  ]
            }
          />
        )}
      </Panel>

      {/* ---------------- Option Modal ---------------- */}
      {optionOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => {
            if (savingOption) return;
            setOptionOpen(false);
          }}
        >
          <div
            className="w-full max-w-[860px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-base">
                  {optionEditing ? "Edit Option" : "Add Option"}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Contest: {contestId}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOptionOpen(false)}
                disabled={savingOption}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  savingOption ? "opacity-60" : ""
                }`}
              >
                Close
              </button>
            </div>

            <div className="grid gap-2.5 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Option Type
                  </div>
                  <select
                    value={optionType}
                    onChange={(e) => {
                      const t = e.target.value as ContestOptionType;
                      setOptionType(t);
                      setOptionTouched(true);
                      if (t === "CANDIDATE") setOptionLabel("");
                      else setOptionElectId("");
                    }}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white"
                  >
                    {OPTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Option Order
                  </div>
                  <input
                    type="number"
                    value={optionOrder}
                    onChange={(e) =>
                      setOptionOrder(Number(e.target.value || 1))
                    }
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                    min={1}
                  />
                </div>
              </div>

              {optionType === "LABEL" ? (
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Option Label <span className="text-red-600">*</span>
                  </div>
                  <input
                    value={optionLabel}
                    onChange={(e) => {
                      setOptionLabel(e.target.value);
                      setOptionTouched(true);
                    }}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none"
                  />
                  {optionTouched && !normalizeName(optionLabel) ? (
                    <div className="text-[11px] font-bold text-red-600">
                      Required for LABEL
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="grid gap-1.5">
                  <div className="text-[11px] font-extrabold text-slate-600">
                    Election Candidate <span className="text-red-600">*</span>
                  </div>

                  <select
                    value={optionElectId}
                    onChange={(e) => {
                      setOptionElectId(e.target.value);
                      setOptionTouched(true);
                    }}
                    className="px-3 py-2.5 rounded-lg border border-slate-200 outline-none bg-white"
                    disabled={
                      electionCandidatesQ.isLoading ||
                      electionCandidatesQ.isError
                    }
                  >
                    <option value="">
                      {electionCandidatesQ.isLoading
                        ? "Loading election candidates…"
                        : electionCandidatesQ.isError
                        ? "Failed to load candidates"
                        : "Select election candidate…"}
                    </option>

                    {electionCandidatesAll.map((ec) => {
                      const meta = [ec.partyAbbrev, ec.centerName]
                        .filter(Boolean)
                        .join(" · ");
                      return (
                        <option key={ec.electId} value={ec.electId}>
                          {meta ? `${ec.fullName} (${meta})` : ec.fullName}
                        </option>
                      );
                    })}
                  </select>

                  {optionTouched && !optionElectId.trim() ? (
                    <div className="text-[11px] font-bold text-red-600">
                      Required for CANDIDATE
                    </div>
                  ) : null}
                </div>
              )}

              <div className="grid gap-1.5">
                <div className="text-[11px] font-extrabold text-slate-600">
                  Active
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={optionActive}
                    onChange={(e) => setOptionActive(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Active
                </label>
              </div>

              {optionCreateM.isError || optionUpdateM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {optionCreateM.isError
                    ? friendlySaveError(optionCreateM.error)
                    : friendlySaveError(optionUpdateM.error)}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setOptionOpen(false)}
                  disabled={savingOption}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    savingOption ? "opacity-60" : ""
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canEdit || savingOption}
                  onClick={() => {
                    setOptionTouched(true);
                    if (!canEdit) return;
                    if (optionEditing) optionUpdateM.mutate();
                    else optionCreateM.mutate();
                  }}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || savingOption ? "opacity-60" : ""
                  }`}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ---------------- Bulk Assign Modal ---------------- */}
      {bulkOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40"
          onClick={() => {
            if (bulkAssignM.isPending) return;
            setBulkOpen(false);
          }}
        >
          <div
            className="w-full max-w-[980px] bg-white rounded-2xl border border-slate-200 p-4 mx-auto shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between gap-3">
              <div>
                <div className="font-extrabold text-base">
                  Bulk Assign Election Candidates
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Contest: {contestId}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setBulkOpen(false)}
                disabled={bulkAssignM.isPending}
                className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                  bulkAssignM.isPending ? "opacity-60" : ""
                }`}
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 mt-3">
              <div className="flex flex-wrap items-center gap-4">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulkMode"
                    checked={bulkMode === "ALL"}
                    onChange={() => setBulkMode("ALL")}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Assign ALL (filtered list)
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="radio"
                    name="bulkMode"
                    checked={bulkMode === "MANUAL"}
                    onChange={() => setBulkMode("MANUAL")}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Select manually
                </label>

                <label className="inline-flex items-center gap-2 text-sm text-slate-700 ml-auto">
                  <input
                    type="checkbox"
                    checked={bulkReplace}
                    onChange={(e) => setBulkReplace(e.target.checked)}
                    className="h-4 w-4 accent-emerald-600"
                  />
                  Replace mode (deactivate not selected)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search
                    size={16}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    value={bulkSearch}
                    onChange={(e) => setBulkSearch(e.target.value)}
                    placeholder="Search name / party abbrev / center…"
                    className="pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white w-full outline-none"
                  />
                </div>

                <button
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  onClick={() => setBulkSearch("")}
                >
                  Clear
                </button>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-600 flex items-center justify-between">
                  <span>
                    Candidates: <b>{electionCandidatesFiltered.length}</b>
                  </span>
                  {bulkMode === "MANUAL" ? (
                    <button
                      type="button"
                      className="text-xs font-bold underline"
                      onClick={() => {
                        const all = electionCandidatesFiltered.map(
                          (x) => x.electId
                        );
                        setBulkSelected(all);
                      }}
                    >
                      Select all (filtered)
                    </button>
                  ) : null}
                </div>

                <div className="max-h-[420px] overflow-auto">
                  {electionCandidatesQ.isLoading ? (
                    <div className="p-3 text-slate-600 text-sm">
                      Loading election candidates…
                    </div>
                  ) : electionCandidatesQ.isError ? (
                    <div className="p-3 text-red-700 text-sm">
                      Failed to load election candidates.
                    </div>
                  ) : electionCandidatesFiltered.length ? (
                    <div className="divide-y divide-slate-100">
                      {electionCandidatesFiltered.map((ec) => {
                        const meta = [ec.partyAbbrev, ec.centerName]
                          .filter(Boolean)
                          .join(" · ");
                        const checked = bulkSelected.includes(ec.electId);

                        return (
                          <label
                            key={ec.electId}
                            className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50"
                          >
                            <input
                              type="checkbox"
                              disabled={bulkMode === "ALL"}
                              checked={bulkMode === "ALL" ? true : checked}
                              onChange={(e) => {
                                if (bulkMode === "ALL") return;
                                const on = e.target.checked;
                                setBulkSelected((prev) => {
                                  if (on)
                                    return Array.from(
                                      new Set([...prev, ec.electId])
                                    );
                                  return prev.filter((x) => x !== ec.electId);
                                });
                              }}
                              className="mt-1 h-4 w-4 accent-emerald-600"
                            />
                            <div className="grid">
                              <span className="text-sm font-bold text-slate-800">
                                {ec.fullName}
                              </span>
                              <span className="text-xs text-slate-500">
                                {meta || "—"}
                              </span>
                              <span className="text-[11px] text-slate-400 break-all">
                                electId: {ec.electId}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-slate-600 text-sm">
                      No candidates match your search.
                    </div>
                  )}
                </div>
              </div>

              {bulkAssignM.isError ? (
                <div className="p-2 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
                  {friendlySaveError(bulkAssignM.error)}
                </div>
              ) : null}

              <div className="flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setBulkOpen(false)}
                  disabled={bulkAssignM.isPending}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white ${
                    bulkAssignM.isPending ? "opacity-60" : ""
                  }`}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={!canEdit || bulkAssignM.isPending}
                  onClick={() => bulkAssignM.mutate()}
                  className={`px-3 py-2 rounded-lg border border-slate-200 bg-white font-extrabold ${
                    !canEdit || bulkAssignM.isPending ? "opacity-60" : ""
                  }`}
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
