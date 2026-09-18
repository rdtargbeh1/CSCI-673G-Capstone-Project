// // src/pages/elections/workspace/tabs/submissions/SubmissionNormalizationTab.tsx

// import { useEffect, useMemo, useState } from "react";

// import { useQuery, useQueryClient } from "@tanstack/react-query";

// import {
//   AlertCircle,
//   CalendarDays,
//   CheckCircle2,
//   FilterX,
//   RefreshCw,
//   Search,
//   Vote,
// } from "lucide-react";

// import { useAuthStore } from "../../../../../../shared/store/authStore";

// import { Badge } from "../../../../shared/elections-ui";

// import {
//   listActiveElections,
//   type ElectionDto,
// } from "../../../../../../shared/services/electionService";

// import { listContestsByElection } from "../../../../../../shared/services/contestService";

// import type { ContestDto } from "../../../../../../auth/contestTypes";

// import {
//   searchNormalizedSubmissionContestVotes,
//   type VoteSubmissionContestSearchRow,
// } from "../../../../../../shared/services/voteSubmissionContestService";

// // ============================================================================
// // HELPERS
// // ============================================================================

// function safeStr(value: unknown) {
//   return typeof value === "string" ? value : value == null ? "" : String(value);
// }

// function friendlyError(error: any) {
//   return (
//     safeStr(error?.response?.data?.message) ||
//     safeStr(error?.response?.data?.error) ||
//     safeStr(error?.message) ||
//     "Request failed."
//   );
// }

// function formatDate(value: string | null | undefined) {
//   if (!value) {
//     return "—";
//   }

//   const date = new Date(value);

//   if (Number.isNaN(date.getTime())) {
//     return value;
//   }

//   return date.toLocaleString();
// }

// // ============================================================================
// // COMPONENT
// // ============================================================================

// export default function SubmissionNormalizationTab() {
//   const queryClient = useQueryClient();

//   // ==========================================================================
//   // CONTEXT
//   // ==========================================================================

//   const dashboardMode = useAuthStore((state) => state.dashboardMode);

//   const currentOrgId = useAuthStore((state) => state.currentOrgId);

//   const needsOrg = dashboardMode === "TENANT" || dashboardMode === "NEC";

//   const orgId = currentOrgId || "";

//   // ==========================================================================
//   // FILTER STATE
//   // ==========================================================================

//   const [electionId, setElectionId] = useState("");

//   const [contestId, setContestId] = useState("");

//   const [search, setSearch] = useState("");

//   // ==========================================================================
//   // PAGINATION
//   // ==========================================================================

//   const [page, setPage] = useState(0);

//   const [size, setSize] = useState(25);

//   // ==========================================================================
//   // ELECTIONS
//   // ==========================================================================

//   const electionsQuery = useQuery({
//     queryKey: ["elections", "active", "normalization-read"],

//     queryFn: () => listActiveElections(),

//     staleTime: 60_000,

//     retry: 1,
//   });

//   const elections = useMemo<ElectionDto[]>(
//     () => electionsQuery.data ?? [],

//     [electionsQuery.data],
//   );

//   // ==========================================================================
//   // DEFAULT ELECTION
//   // ==========================================================================

//   useEffect(() => {
//     if (electionId || elections.length === 0) {
//       return;
//     }

//     const sorted = [...elections].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));

//     setElectionId(sorted[0].electionId);
//   }, [elections, electionId]);

//   // ==========================================================================
//   // SELECTED ELECTION
//   // ==========================================================================

//   const selectedElection = useMemo(
//     () =>
//       elections.find((election) => election.electionId === electionId) ?? null,

//     [elections, electionId],
//   );

//   // ==========================================================================
//   // CONTESTS
//   // ==========================================================================

//   const contestsQuery = useQuery({
//     enabled: Boolean(electionId),

//     queryKey: ["contests", "by-election", electionId, "normalization-read"],

//     queryFn: () => listContestsByElection(electionId),

//     staleTime: 60_000,

//     retry: 1,
//   });

//   const contests: ContestDto[] = useMemo(
//     () => (contestsQuery.data ?? []) as ContestDto[],

//     [contestsQuery.data],
//   );

//   // ==========================================================================
//   // NORMALIZED ROWS
//   // ==========================================================================

//   const rowsQuery = useQuery({
//     enabled: Boolean(orgId && electionId),

//     queryKey: ["normalize-search", orgId, electionId, contestId, page, size],

//     queryFn: () =>
//       searchNormalizedSubmissionContestVotes({
//         orgId,

//         electionId,

//         contestId: contestId || undefined,

//         page,

//         size,
//       }),

//     staleTime: 10_000,

//     retry: 1,
//   });

//   const rows: VoteSubmissionContestSearchRow[] = useMemo(
//     () => rowsQuery.data?.content ?? [],

//     [rowsQuery.data],
//   );

//   const totalPages = Math.max(1, rowsQuery.data?.totalPages ?? 1);

//   const totalElements = rowsQuery.data?.totalElements ?? rows.length;

//   // ==========================================================================
//   // CLIENT SEARCH ON CURRENT PAGE
//   // ==========================================================================

//   const visibleRows = useMemo(() => {
//     const query = search.trim().toLowerCase();

//     if (!query) {
//       return rows;
//     }

//     return rows.filter((row) => {
//       const searchable = [
//         row.centerName,
//         row.contestName,
//         row.candidateFullName,
//         row.optionLabel,
//         row.voteValue,
//         row.dateCreated,
//       ]
//         .filter((value) => value != null)
//         .join(" ")
//         .toLowerCase();

//       return searchable.includes(query);
//     });
//   }, [rows, search]);

//   // ==========================================================================
//   // RESET PAGE WHEN SERVER FILTER CHANGES
//   // ==========================================================================

//   useEffect(() => {
//     setPage(0);
//   }, [electionId, contestId]);

//   // ==========================================================================
//   // REFRESH
//   // ==========================================================================

//   const refreshNow = async () => {
//     await queryClient.invalidateQueries({
//       queryKey: ["normalize-search"],
//     });

//     await queryClient.invalidateQueries({
//       queryKey: ["contests", "by-election", electionId],
//     });

//     await Promise.all([
//       rowsQuery.refetch(),

//       electionId ? contestsQuery.refetch() : Promise.resolve(),
//     ]);
//   };

//   // ==========================================================================
//   // CLEAR
//   // ==========================================================================

//   const clearFilters = () => {
//     setContestId("");

//     setSearch("");

//     setPage(0);
//   };

//   // ==========================================================================
//   // ORG REQUIRED
//   // ==========================================================================

//   const missingOrg = needsOrg && !orgId;

//   // ==========================================================================
//   // RENDER
//   // ==========================================================================

//   return (
//     <div className="w-full">
//       <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
//         {/* ==================================================================
//             HEADER
//         ================================================================== */}

//         <section className="rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
//           <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//             <div className="min-w-0">
//               <div className="flex flex-wrap items-center gap-2">
//                 <h1 className="text-lg font-bold text-slate-900 sm:text-xl">
//                   Submission Normalization
//                 </h1>

//                 <Badge text="Read-only" />

//                 <Badge text={`Mode: ${dashboardMode}`} />
//               </div>

//               <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
//                 View normalized contest vote records generated from verified
//                 submissions.
//               </p>
//             </div>

//             <button
//               type="button"
//               onClick={refreshNow}
//               disabled={rowsQuery.isFetching || contestsQuery.isFetching}
//               className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:text-sm"
//             >
//               <RefreshCw
//                 size={15}
//                 className={
//                   rowsQuery.isFetching || contestsQuery.isFetching
//                     ? "animate-spin"
//                     : ""
//                 }
//               />
//               Refresh
//             </button>
//           </div>
//         </section>

//         {/* ==================================================================
//             ORG WARNING
//         ================================================================== */}

//         {missingOrg && (
//           <section className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-amber-800">
//             <AlertCircle size={17} className="mt-0.5 shrink-0" />
//             Select an organization to view normalized submission data.
//           </section>
//         )}

//         {/* ==================================================================
//             FILTERS
//         ================================================================== */}

//         <section className="rounded-xl border border-slate-200 bg-white p-3">
//           <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_minmax(240px,1.3fr)_auto] lg:items-end">
//             {/* ==============================================================
//                 ELECTION
//             ============================================================== */}

//             <div className="min-w-0">
//               <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
//                 Election
//               </label>

//               <select
//                 value={electionId}
//                 onChange={(event) => {
//                   setElectionId(event.target.value);

//                   setContestId("");

//                   setPage(0);
//                 }}
//                 disabled={electionsQuery.isLoading}
//                 className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
//               >
//                 {elections.length === 0 && (
//                   <option value="">No active elections</option>
//                 )}

//                 {elections.map((election) => (
//                   <option key={election.electionId} value={election.electionId}>
//                     {election.electionName} ({election.year})
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* ==============================================================
//                 CONTEST
//             ============================================================== */}

//             <div className="min-w-0">
//               <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
//                 Contest
//               </label>

//               <select
//                 value={contestId}
//                 onChange={(event) => {
//                   setContestId(event.target.value);

//                   setPage(0);
//                 }}
//                 disabled={!electionId || contestsQuery.isLoading}
//                 className="min-h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
//               >
//                 <option value="">All contests</option>

//                 {contests.map((contest) => (
//                   <option key={contest.contestId} value={contest.contestId}>
//                     {contest.contestName}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* ==============================================================
//                 SEARCH
//             ============================================================== */}

//             <div className="min-w-0">
//               <label className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
//                 Search Current Page
//               </label>

//               <div className="relative">
//                 <Search
//                   size={15}
//                   className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
//                 />

//                 <input
//                   value={search}
//                   onChange={(event) => setSearch(event.target.value)}
//                   placeholder="Center, contest, candidate..."
//                   className="min-h-10 w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
//                 />
//               </div>
//             </div>

//             {/* ==============================================================
//                 CLEAR
//             ============================================================== */}

//             <button
//               type="button"
//               onClick={clearFilters}
//               className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:text-sm"
//             >
//               <FilterX size={15} />
//               Clear
//             </button>
//           </div>

//           {/* ================================================================
//               SELECTED CONTEXT
//           ================================================================ */}

//           {selectedElection && (
//             <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-2 text-xs text-slate-500">
//               <span>
//                 Election:{" "}
//                 <strong className="text-slate-700">
//                   {selectedElection.electionName}
//                 </strong>
//               </span>

//               <span>
//                 Rows:{" "}
//                 <strong className="text-slate-700">{totalElements}</strong>
//               </span>
//             </div>
//           )}
//         </section>

//         {/* ==================================================================
//             QUERY ERRORS
//         ================================================================== */}

//         {(electionsQuery.isError ||
//           contestsQuery.isError ||
//           rowsQuery.isError) && (
//           <section className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
//             <AlertCircle size={17} className="mt-0.5 shrink-0" />

//             {friendlyError(
//               electionsQuery.error ?? contestsQuery.error ?? rowsQuery.error,
//             )}
//           </section>
//         )}

//         {/* ==================================================================
//             LOADING
//         ================================================================== */}

//         {rowsQuery.isLoading && !missingOrg && (
//           <section className="rounded-xl border border-slate-200 bg-white p-6 text-center">
//             <RefreshCw
//               size={20}
//               className="mx-auto animate-spin text-blue-600"
//             />

//             <div className="mt-2 text-sm font-medium text-slate-500">
//               Loading normalized rows...
//             </div>
//           </section>
//         )}

//         {/* ==================================================================
//             RESULTS
//         ================================================================== */}

//         {!rowsQuery.isLoading && !missingOrg && (
//           <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
//             {/* ============================================================
//                   RESULT HEADER
//               ============================================================ */}

//             <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2.5 sm:px-4">
//               <div className="flex items-center gap-2">
//                 <Vote size={16} className="text-blue-600" />

//                 <span className="text-sm font-bold text-slate-800">
//                   Normalized Rows
//                 </span>
//               </div>

//               <span className="inline-flex items-center gap-1 rounded-full bg-slate-200/70 px-2 py-0.5 text-[10px] font-bold text-slate-600">
//                 <CheckCircle2 size={11} />
//                 Read-only
//               </span>
//             </div>

//             {/* ============================================================
//                   DESKTOP COLUMN HEADER
//               ============================================================ */}

//             <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(210px,1.2fr)_90px_180px] items-center gap-4 border-b border-slate-200 bg-white px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500 md:grid">
//               <div>Center</div>

//               <div>Contest</div>

//               <div>Candidate / Option</div>

//               <div>Votes</div>

//               <div>Date</div>
//             </div>

//             {/* ============================================================
//                   EMPTY
//               ============================================================ */}

//             {visibleRows.length === 0 ? (
//               <div className="px-4 py-10 text-center">
//                 <Vote size={28} className="mx-auto text-slate-300" />

//                 <div className="mt-2 text-sm font-bold text-slate-800">
//                   No normalized rows found
//                 </div>

//                 <div className="mt-1 text-xs text-slate-500">
//                   {search
//                     ? "No records on this page match your search."
//                     : "No normalized submission records are available for the selected filters."}
//                 </div>
//               </div>
//             ) : (
//               visibleRows.map((row) => {
//                 const optionName =
//                   row.candidateFullName ?? row.optionLabel ?? "—";

//                 return (
//                   <div
//                     key={row.scvId}
//                     className="border-b border-slate-100 px-3 py-2.5 last:border-b-0 sm:px-4"
//                   >
//                     {/* ==================================================
//                             MOBILE
//                         ================================================== */}

//                     <div className="md:hidden">
//                       <div className="flex min-w-0 items-start justify-between gap-3">
//                         <div className="min-w-0 flex-1">
//                           {/* CANDIDATE */}

//                           <div className="truncate text-sm font-bold text-slate-900">
//                             {optionName}
//                           </div>

//                           {/* CONTEST */}

//                           <div className="mt-0.5 truncate text-xs font-semibold text-blue-700">
//                             {row.contestName ?? "—"}
//                           </div>

//                           {/* CENTER */}

//                           <div className="mt-1 truncate text-[11px] text-slate-500">
//                             {row.centerName ?? "—"}
//                           </div>

//                           {/* DATE */}

//                           <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
//                             <CalendarDays size={11} />

//                             {formatDate(row.dateCreated)}
//                           </div>
//                         </div>

//                         {/* VOTE VALUE */}

//                         <div className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-center">
//                           <div className="text-[9px] font-bold uppercase tracking-wide text-blue-500">
//                             Votes
//                           </div>

//                           <div className="mt-0.5 text-lg font-bold text-blue-700">
//                             {row.voteValue ?? 0}
//                           </div>
//                         </div>
//                       </div>
//                     </div>

//                     {/* ==================================================
//                             DESKTOP
//                         ================================================== */}

//                     <div className="hidden grid-cols-[minmax(180px,1fr)_minmax(180px,1fr)_minmax(210px,1.2fr)_90px_180px] items-center gap-4 md:grid">
//                       <div
//                         className="truncate text-sm font-semibold text-slate-700"
//                         title={row.centerName ?? ""}
//                       >
//                         {row.centerName ?? "—"}
//                       </div>

//                       <div
//                         className="truncate text-sm font-semibold text-slate-700"
//                         title={row.contestName ?? ""}
//                       >
//                         {row.contestName ?? "—"}
//                       </div>

//                       <div
//                         className="truncate text-sm font-bold text-slate-900"
//                         title={optionName}
//                       >
//                         {optionName}
//                       </div>

//                       <div>
//                         <span className="inline-flex min-w-10 items-center justify-center rounded-lg bg-blue-50 px-2 py-1 text-sm font-bold text-blue-700">
//                           {row.voteValue ?? 0}
//                         </span>
//                       </div>

//                       <div className="text-xs font-medium text-slate-500">
//                         {formatDate(row.dateCreated)}
//                       </div>
//                     </div>
//                   </div>
//                 );
//               })
//             )}
//           </section>
//         )}

//         {/* ==================================================================
//             PAGINATION
//         ================================================================== */}

//         {!missingOrg && (
//           <section className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
//             <div className="text-xs font-semibold text-slate-500">
//               Page <strong className="text-slate-800">{page + 1}</strong> of{" "}
//               <strong className="text-slate-800">{totalPages}</strong>
//               <span className="ml-2 text-slate-400">
//                 • {totalElements} rows
//               </span>
//             </div>

//             <div className="flex items-center gap-2">
//               {/* PAGE SIZE */}

//               <select
//                 value={size}
//                 onChange={(event) => {
//                   setSize(Number(event.target.value));

//                   setPage(0);
//                 }}
//                 className="min-h-9 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700"
//                 aria-label="Page size"
//               >
//                 <option value={10}>10</option>

//                 <option value={25}>25</option>

//                 <option value={50}>50</option>

//                 <option value={100}>100</option>
//               </select>

//               {/* PREVIOUS */}

//               <button
//                 type="button"
//                 disabled={page <= 0}
//                 onClick={() => setPage((current) => Math.max(0, current - 1))}
//                 className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
//               >
//                 Previous
//               </button>

//               {/* NEXT */}

//               <button
//                 type="button"
//                 disabled={page >= totalPages - 1}
//                 onClick={() => setPage((current) => current + 1)}
//                 className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
//               >
//                 Next
//               </button>
//             </div>
//           </section>
//         )}
//       </div>
//     </div>
//   );
// }
