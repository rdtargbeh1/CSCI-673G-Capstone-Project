
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
  X,
  AlertCircle,
} from "lucide-react";

import { useAuthStore } from "../../../../../../shared/store/authStore";
import {
  Panel,
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

/** ============ HELPERS ============ */
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

const OPTION_TYPES: ContestOptionType[] = ["CANDIDATE", "LABEL"];

type Props = {
  contestId: string | null;
  onBack: () => void;
};

/** ============ MAIN COMPONENT ============ */
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

  /** ============ QUERIES ============ */
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

  /** ============ HANDLERS (BEFORE MUTATIONS) ============ */
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

  /** ============ MUTATIONS ============ */
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

  /** ============ STATE ============ */
  const savingOption = optionCreateM.isPending || optionUpdateM.isPending;

  /** ============ TABLE ROWS ============ */
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
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-green-600 hover:bg-green-50 transition ${
              !canEdit ? "opacity-60" : ""
            }`}
            onClick={() => openEditOption(o)}
            title={canEdit ? "Edit option" : "Read-only"}
          >
            <Pencil size={20} />
          </button>

          <button
            type="button"
            disabled={!canEdit || optionDeleteM.isPending}
            className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-red-700 hover:bg-red-50 transition ${
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
            <Trash2 size={20} className="text-red-600" />
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
        <span key="val" className="text-base text-slate-700 break-words">
          {displayValue}
        </span>,
        <span
          key="act"
          className={`text-base font-bold ${
            activeVal ? "text-emerald-700" : "text-slate-500"
          }`}
        >
          {activeVal ? "✅ ACTIVE" : "⚪ INACTIVE"}
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

  /** ============ RENDER ============ */
  return (
    <div className="flex flex-col gap-3">
      {!canEdit ? (
        <ReadOnlyBanner
          reason="Contest options are managed by NEC/System Admin. You can view options read-only."
          sources={["contest_option"]}
        />
      ) : null}

      {/* ============ HEADER ACTIONS ============ */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-red-200 hover:bg-red-300 transition"
        >
          <ArrowLeft size={18} /> Back to Contests
        </button>

        <Badge text={`Contest: ${contestId}`} />

        <button
          type="button"
          onClick={refreshNow}
          disabled={optionsQ.isFetching}
          className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition ${
            optionsQ.isFetching ? "opacity-60" : ""
          }`}
        >
          <RefreshCw size={16} /> Refresh
        </button>

        <div className="ml-auto flex items-center gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-700">
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
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm ${
              !canEdit ? "opacity-60" : ""
            }`}
          >
            <Plus size={16} className="text-red-500" />
            Add Option
          </button>

          <button
            type="button"
            disabled={!canEdit}
            onClick={openBulkAssign}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-red-900 text-white font-bold hover:bg-red-800 transition shadow-sm ${
              !canEdit ? "opacity-60" : ""
            }`}
          >
            <Users size={16} />
            Bulk Assign
          </button>
        </div>
      </div>

      {/* ============ PANEL ============ */}
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

      {/* ============ OPTION MODAL ============ */}
      {optionOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (savingOption) return;
            setOptionOpen(false);
          }}
        >
          <div
            className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-blue-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  {optionEditing ? (
                    <>
                      <Pencil size={28} className="text-white" />
                      Edit Option
                    </>
                  ) : (
                    <>
                      <Plus size={28} className="text-red-500" />
                      Add Option
                    </>
                  )}
                </h2>
                <p className="text-sm sm:text-base font-semibold text-blue-100 mt-2">
                  {optionEditing
                    ? "Update contest option settings."
                    : "Create a new option for this contest."}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (savingOption) return;
                  setOptionOpen(false);
                }}
                disabled={savingOption}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-blue-300 hover:bg-blue-700 bg-blue-600 transition text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 space-y-5 sm:space-y-6">
              {/* Type + Order */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    Option Type
                  </label>
                  <select
                    value={optionType}
                    onChange={(e) => {
                      const t = e.target.value as ContestOptionType;
                      setOptionType(t);
                      setOptionTouched(true);
                      if (t === "CANDIDATE") setOptionLabel("");
                      else setOptionElectId("");
                    }}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  >
                    {OPTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    Option Order
                  </label>
                  <input
                    type="number"
                    value={optionOrder}
                    onChange={(e) =>
                      setOptionOrder(Number(e.target.value || 1))
                    }
                    min={1}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* LABEL or CANDIDATE */}
              {optionType === "LABEL" ? (
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    Option Label <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={optionLabel}
                    onChange={(e) => {
                      setOptionLabel(e.target.value);
                      setOptionTouched(true);
                    }}
                    placeholder="e.g., Abstain, Write-in, etc."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  {optionTouched && !normalizeName(optionLabel) && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600 font-semibold">
                      <AlertCircle size={16} /> Required for LABEL
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                    Election Candidate <span className="text-red-600">*</span>
                  </label>

                  <select
                    value={optionElectId}
                    onChange={(e) => {
                      setOptionElectId(e.target.value);
                      setOptionTouched(true);
                    }}
                    disabled={
                      electionCandidatesQ.isLoading ||
                      electionCandidatesQ.isError
                    }
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-60 disabled:cursor-not-allowed"
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

                  {optionTouched && !optionElectId.trim() && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-red-600 font-semibold">
                      <AlertCircle size={16} /> Required for CANDIDATE
                    </div>
                  )}
                </div>
              )}

              {/* Active */}
              <div>
                <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                  Status
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={optionActive}
                    onChange={(e) => setOptionActive(e.target.checked)}
                    className="h-5 w-5 accent-blue-600 cursor-pointer"
                  />
                  <span className="text-base font-semibold text-slate-900">
                    Active
                  </span>
                </label>
              </div>

              {/* Error */}
              {optionCreateM.isError || optionUpdateM.isError ? (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-red-700 font-semibold">
                    {optionCreateM.isError
                      ? friendlySaveError(optionCreateM.error)
                      : friendlySaveError(optionUpdateM.error)}
                  </div>
                </div>
              ) : null}
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (savingOption) return;
                  setOptionOpen(false);
                }}
                disabled={savingOption}
                className="px-4 sm:px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
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
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || savingOption
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-blue-600 hover:bg-blue-700 shadow-sm"
                }`}
              >
                {savingOption ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Saving…</span>
                  </>
                ) : (
                  <>
                    <Plus size={18} className="text-red-500" />
                    <span className="hidden sm:inline">
                      {optionEditing ? "Update" : "Save"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ============ BULK ASSIGN MODAL ============ */}
      {bulkOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-sm"
          onClick={() => {
            if (bulkAssignM.isPending) return;
            setBulkOpen(false);
          }}
        >
          <div
            className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* HEADER */}
            <div className="bg-gradient-to-r from-red-600 via-red-500 to-red-400 px-4 sm:px-8 py-6 sm:py-8 border-b border-red-600 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
                  <Users size={28} className="text-white" />
                  Bulk Assign Candidates
                </h2>
                <p className="text-sm sm:text-base font-semibold text-red-100 mt-2">
                  Assign election candidates to this contest in bulk.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (bulkAssignM.isPending) return;
                  setBulkOpen(false);
                }}
                disabled={bulkAssignM.isPending}
                className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg border-2 border-red-300 hover:bg-red-700 bg-red-600 transition text-white disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 sm:py-7 space-y-5 sm:space-y-6">
              {/* Mode Selection */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="bulkMode"
                    checked={bulkMode === "ALL"}
                    onChange={() => setBulkMode("ALL")}
                    className="h-5 w-5 accent-red-600 cursor-pointer"
                  />
                  <span className="text-base font-semibold text-slate-900">
                    Assign ALL (filtered list)
                  </span>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="bulkMode"
                    checked={bulkMode === "MANUAL"}
                    onChange={() => setBulkMode("MANUAL")}
                    className="h-5 w-5 accent-red-600 cursor-pointer"
                  />
                  <span className="text-base font-semibold text-slate-900">
                    Select manually
                  </span>
                </label>
              </div>

              {/* Replace Mode */}
              <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-300 bg-slate-50 cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={bulkReplace}
                  onChange={(e) => setBulkReplace(e.target.checked)}
                  className="h-5 w-5 accent-red-600 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="text-base font-semibold text-slate-900">
                    Replace mode
                  </span>
                  <p className="text-sm text-slate-600">
                    Deactivate all candidates not selected
                  </p>
                </div>
              </label>

              {/* Search */}
              <div>
                <label className="block text-base font-bold text-slate-900 mb-2 sm:mb-3">
                  Search & Filter
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search
                      size={16}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                    />
                    <input
                      value={bulkSearch}
                      onChange={(e) => setBulkSearch(e.target.value)}
                      placeholder="Search name / party abbrev / center…"
                      className="w-full pl-9 pr-4 py-2.5 sm:py-3 rounded-lg border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 transition"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setBulkSearch("")}
                    className="px-4 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Candidates List */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 text-base font-bold text-slate-600 flex items-center justify-between border-b border-slate-200">
                  <span>
                    Candidates: <b className="text-slate-900">{electionCandidatesFiltered.length}</b>
                  </span>
                  {bulkMode === "MANUAL" && electionCandidatesFiltered.length > 0 ? (
                    <button
                      type="button"
                      className="text-sm font-bold text-blue-600 hover:text-blue-700 underline"
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

                <div className="max-h-[380px] overflow-auto">
                  {electionCandidatesQ.isLoading ? (
                    <div className="p-4 text-slate-600 text-base">
                      Loading election candidates…
                    </div>
                  ) : electionCandidatesQ.isError ? (
                    <div className="p-4 text-red-700 text-base">
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
                            className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition"
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
                              className="mt-1 h-5 w-5 accent-red-600 cursor-pointer"
                            />
                            <div className="grid">
                              <span className="text-base font-bold text-slate-900">
                                {ec.fullName}
                              </span>
                              {meta && (
                                <span className="text-base text-slate-600">
                                  {meta}
                                </span>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-4 text-slate-600 text-base">
                      No candidates match your search.
                    </div>
                  )}
                </div>
              </div>

              {/* Error */}
              {bulkAssignM.isError ? (
                <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-3 sm:p-4">
                  <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-red-700 font-semibold">
                    {friendlySaveError(bulkAssignM.error)}
                  </div>
                </div>
              ) : null}
            </div>

            {/* FOOTER */}
            <div className="border-t border-slate-200 bg-slate-50 px-4 sm:px-8 py-4 sm:py-5 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (bulkAssignM.isPending) return;
                  setBulkOpen(false);
                }}
                disabled={bulkAssignM.isPending}
                className="px-4 sm:px-6 h-10 rounded-lg border border-slate-300 bg-white text-slate-900 text-base font-semibold hover:bg-slate-50 transition disabled:opacity-50 sm:min-w-fit"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!canEdit || bulkAssignM.isPending}
                onClick={() => bulkAssignM.mutate()}
                className={`px-4 sm:px-6 h-10 rounded-lg text-base font-semibold text-white transition flex items-center justify-center gap-2 sm:min-w-fit ${
                  !canEdit || bulkAssignM.isPending
                    ? "bg-slate-300 cursor-not-allowed opacity-60"
                    : "bg-red-600 hover:bg-red-700 shadow-sm"
                }`}
              >
                {bulkAssignM.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Assigning…</span>
                  </>
                ) : (
                  <>
                    <Users size={18} />
                    <span className="hidden sm:inline">Assign</span>
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
 
