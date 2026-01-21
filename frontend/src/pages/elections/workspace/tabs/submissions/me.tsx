// // ✅ FILE: src/pages/operations/observer-reports/ObserverReportsPage.tsx
// //
// // ✅ UPDATED: Added District support (list column + view modal + form data plumbing)
// // - Fetch districts (for the form)
// // - Show District column in table
// // - Show District in View modal
// // - Pass districts into ObserverReportFormModal
// //
// // ❗No change to your existing auth/tenant rules (kept as-is)

// import { useMemo, useState } from "react";
// import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
// import { Plus, RefreshCw, Pencil, Trash2, Eye } from "lucide-react";

// import {
//   Badge,
//   Card,
//   Note,
//   OpsPageShell,
//   Table,
// } from "../operations/shared/ops-ui";
// import { useAuthStore } from "../../shared/store/authStore";

// import { fetchMe } from "../../shared/services/userService";
// import type { UserDto } from "../../auth/userTypes";

// import {
//   fetchCounties,
//   type CountyDto,
// } from "../../shared/services/countyService";
// import {
//   fetchPollingCenters,
//   type PollingCenterDto,
// } from "../../shared/services/pollingCenterService";

// // ✅ NEW
// import {
//   fetchDistricts,
//   type DistrictDto,
// } from "../../shared/services/districtService";

// import {
//   searchObserverReports,
//   createObserverReport,
//   updateObserverReport,
//   deleteObserverReport,
//   getObserverReport,
//   type ObserverReportDto,
//   type ObserverReportCreateRequest,
//   type ObserverReportUpdateRequest,
//   type ReportType,
// } from "../../shared/services/observerReportService";

// import ObserverReportFormModal from "./ObserverReportFormModal";

// /** ---------------- helpers ---------------- */
// function safeStr(v: any) {
//   return typeof v === "string" ? v : v == null ? "" : String(v);
// }
// function friendlyError(err: any): string {
//   return (
//     safeStr(err?.response?.data?.message) ||
//     safeStr(err?.response?.data?.error) ||
//     safeStr(err?.message) ||
//     "Request failed."
//   );
// }
// function fullName(u: any) {
//   const fn = String(u?.firstName ?? "").trim();
//   const ln = String(u?.lastName ?? "").trim();
//   const nm = `${fn} ${ln}`.trim();
//   return nm || String(u?.userName ?? "—");
// }
// function evidenceLabel(r: any) {
//   const url = String(r?.mediaUrl ?? "").trim();
//   return url ? "Attached" : "Missing";
// }

// export default function ObserverReportsPage() {
//   const qc = useQueryClient();

//   const user = useAuthStore((s) => s.user);
//   const dashboardMode = useAuthStore((s) => s.dashboardMode);
//   const currentOrgId = useAuthStore((s) => s.currentOrgId);

//   // ✅ role-based access (not dashboardMode)
//   const roleLabel = useAuthStore((s: any) =>
//     typeof s.getRoleLabel === "function" ? s.getRoleLabel() : ""
//   );

//   // Who can perform CRUD operations (kept as your current logic)
//   const canCrud =
//     Boolean(currentOrgId) ||
//     dashboardMode === "SYSTEM" ||
//     dashboardMode === "NEC";

//   // tenant scope
//   const effectiveOrgId = currentOrgId || undefined;

//   /** ---------------- me ---------------- */
//   const meQ = useQuery<UserDto>({
//     enabled: Boolean(effectiveOrgId),
//     queryKey: ["users", "me", "observer-reports", effectiveOrgId],
//     queryFn: () => fetchMe(effectiveOrgId as string),
//     staleTime: 60_000,
//     retry: 1,
//   });
//   const me = meQ.data ?? (user as any);
//   const meName = fullName(me);

//   /** ---------------- geo lists for modal ---------------- */
//   const countiesQ = useQuery<CountyDto[]>({
//     queryKey: ["counties", "all", "observer-reports"],
//     queryFn: async () =>
//       (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
//     staleTime: 60_000,
//     retry: 1,
//   });

//   // ✅ NEW: districts list (for form dropdown)
//   const districtsQ = useQuery<DistrictDto[]>({
//     queryKey: ["districts", "all", "observer-reports"],
//     queryFn: async () =>
//       (await fetchDistricts({ page: 0, size: 1000 })).items as DistrictDto[],
//     staleTime: 60_000,
//     retry: 1,
//   });

//   const centersQ = useQuery<PollingCenterDto[]>({
//     queryKey: ["polling-centers", "all", "observer-reports"],
//     queryFn: async () => {
//       const p = await fetchPollingCenters({ page: 0, size: 1000 });
//       return p.items as PollingCenterDto[];
//     },
//     staleTime: 60_000,
//     retry: 1,
//   });

//   const counties = countiesQ.data ?? [];
//   const districts = districtsQ.data ?? [];
//   const centers = centersQ.data ?? [];

//   /** ---------------- filters ---------------- */
//   const [q, setQ] = useState("");
//   const [type, setType] = useState<ReportType | "">("");
//   const [resolved, setResolved] = useState<"" | "true" | "false">("");

//   const [page, setPage] = useState(0);
//   const size = 20;

//   const listEnabled = Boolean(effectiveOrgId);

//   /** ---------------- list ---------------- */
//   const listQ = useQuery({
//     enabled: listEnabled,
//     queryKey: [
//       "observer-reports",
//       "search",
//       effectiveOrgId,
//       page,
//       size,
//       q,
//       type,
//       resolved,
//     ],
//     queryFn: () =>
//       searchObserverReports({
//         orgId: effectiveOrgId!,
//         page,
//         size,
//         q: q.trim() ? q.trim() : undefined,
//         type: type || undefined,
//         resolved: resolved === "" ? undefined : resolved === "true",
//       }),
//     staleTime: 10_000,
//     retry: 1,
//   });

//   const items: ObserverReportDto[] = (listQ.data?.items ?? []) as any;
//   const totalPages = (listQ.data as any)?.totalPages ?? 1;

//   /** ---------------- view modal ---------------- */
//   const [openView, setOpenView] = useState(false);
//   const [viewId, setViewId] = useState<string>("");

//   const viewQ = useQuery<ObserverReportDto>({
//     enabled: openView && Boolean(viewId),
//     queryKey: ["observer-reports", "get", viewId],
//     queryFn: () => getObserverReport(viewId),
//     staleTime: 10_000,
//     retry: 1,
//   });

//   /** ---------------- create/edit modal ---------------- */
//   const [openForm, setOpenForm] = useState(false);
//   const [formMode, setFormMode] = useState<"create" | "edit">("create");
//   const [editId, setEditId] = useState<string>("");

//   const editQ = useQuery<ObserverReportDto>({
//     enabled: openForm && formMode === "edit" && Boolean(editId),
//     queryKey: ["observer-reports", "edit", editId],
//     queryFn: () => getObserverReport(editId),
//     staleTime: 10_000,
//     retry: 1,
//   });

//   const createM = useMutation({
//     mutationFn: async (p: {
//       req: ObserverReportCreateRequest;
//       files: File[];
//     }) => createObserverReport(p.req, p.files),
//     onSuccess: async () => {
//       await qc.invalidateQueries({
//         queryKey: ["observer-reports", "search", effectiveOrgId],
//       });
//       setOpenForm(false);
//     },
//   });

//   const updateM = useMutation({
//     mutationFn: async (p: {
//       id: string;
//       req: ObserverReportUpdateRequest;
//       files: File[];
//     }) => updateObserverReport(p.id, p.req, p.files),
//     onSuccess: async () => {
//       await qc.invalidateQueries({
//         queryKey: ["observer-reports", "search", effectiveOrgId],
//       });
//       setOpenForm(false);
//     },
//   });

//   const delM = useMutation({
//     mutationFn: async (id: string) => deleteObserverReport(id),
//     onSuccess: async () => {
//       await qc.invalidateQueries({
//         queryKey: ["observer-reports", "search", effectiveOrgId],
//       });
//     },
//   });

//   const rows = useMemo(() => {
//     return items.map((r) => {
//       const county = r.countyName ?? "—";
//       // ✅ NEW
//       const district = (r as any).districtName ?? "—";
//       const center = r.centerCode ? `${r.centerCode}` : r.centerName ?? "—";
//       const desc = String(r.description ?? "");
//       const summary = desc.slice(0, 70) + (desc.length > 70 ? "…" : "");
//       const evidence = evidenceLabel(r);
//       const status = r.resolved ? "Resolved" : "Open";

//       return [
//         <Badge key={`t-${r.reportId}`}>{String(r.type ?? "—")}</Badge>,
//         county,
//         district, // ✅ NEW COLUMN
//         center,
//         summary,
//         <span
//           key={`e-${r.reportId}`}
//           className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold border ${
//             evidence === "Attached"
//               ? "bg-green-50 text-green-700 border-green-200"
//               : "bg-red-50 text-red-700 border-red-200"
//           }`}
//         >
//           {evidence}
//         </span>,
//         <Badge key={`s-${r.reportId}`}>{status}</Badge>,
//         <div key={`a-${r.reportId}`} className="flex items-center gap-2">
//           <button
//             type="button"
//             className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1"
//             onClick={() => {
//               setViewId(String(r.reportId));
//               setOpenView(true);
//             }}
//             title="View"
//           >
//             <Eye size={14} className="text-red-600" />
//             <span className="text-sm font-semibold">View</span>
//           </button>

//           <button
//             type="button"
//             className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 ${
//               !canCrud ? "opacity-50" : ""
//             }`}
//             disabled={!canCrud}
//             onClick={() => {
//               setFormMode("edit");
//               setEditId(String(r.reportId));
//               setOpenForm(true);
//             }}
//             title="Edit"
//           >
//             <Pencil size={14} className="text-green-600" />
//             <span className="text-sm font-semibold">Edit</span>
//           </button>

//           <button
//             type="button"
//             className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 ${
//               !canCrud || delM.isPending ? "opacity-50" : ""
//             }`}
//             disabled={!canCrud || delM.isPending}
//             onClick={() => {
//               if (!confirm("Delete this report?")) return;
//               delM.mutate(String(r.reportId));
//             }}
//             title="Delete"
//           >
//             <Trash2 size={14} className="text-red-600" />
//             <span className="text-sm font-semibold">Delete</span>
//           </button>
//         </div>,
//       ];
//     });
//   }, [items, canCrud, delM.isPending]);

//   return (
//     <OpsPageShell
//       title="Operations • Observer Reports"
//       subtitle={`Actor: ${meName} • Role: ${roleLabel || "—"} • Dashboard: ${
//         dashboardMode ?? "—"
//       } • Tenant(org): ${effectiveOrgId ?? "—"}`}
//       right={<Badge>Evidence-first</Badge>}
//     >
//       <Card
//         title="Reports"
//         right={
//           <div className="flex flex-wrap gap-2">
//             <button
//               className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50 inline-flex items-center gap-2"
//               onClick={() => listQ.refetch()}
//               disabled={!listEnabled || listQ.isFetching}
//               type="button"
//             >
//               <RefreshCw size={16} />
//               Refresh
//             </button>

//             <button
//               className={`rounded-xl border px-3 py-2 text-sm font-extrabold inline-flex items-center gap-2 ${
//                 canCrud
//                   ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
//                   : "bg-white text-slate-700 border-slate-200 opacity-60"
//               }`}
//               type="button"
//               disabled={!canCrud}
//               onClick={() => {
//                 if (!effectiveOrgId) {
//                   alert(
//                     "Tenant orgId is missing. Select a tenant / ensure currentOrgId is set before creating an Observer Report."
//                   );
//                   return;
//                 }
//                 setFormMode("create");
//                 setEditId("");
//                 setOpenForm(true);
//               }}
//               title={
//                 canCrud ? "Create report" : "Only SYSTEM/NEC admins can create"
//               }
//             >
//               <Plus size={16} />
//               New Report
//             </button>
//           </div>
//         }
//       >
//         {!effectiveOrgId ? (
//           <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm font-bold">
//             Missing orgId (tenant scope). Observer Reports are tenant-scoped.
//             {canCrud
//               ? " As SYSTEM/NEC admin, select a tenant (org) before listing/creating."
//               : " Ask an admin to set tenant context."}
//           </div>
//         ) : null}

//         {/* Filters */}
//         <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//           <div className="flex flex-wrap gap-2">
//             <input
//               value={q}
//               onChange={(e) => {
//                 setQ(e.target.value);
//                 setPage(0);
//               }}
//               placeholder="Search…"
//               className="h-9 rounded-lg border bg-white px-3 text-sm w-[220px]"
//             />

//             <select
//               value={type}
//               onChange={(e) => {
//                 setType(e.target.value as any);
//                 setPage(0);
//               }}
//               className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold"
//             >
//               <option value="">All types</option>
//               <option value="VIOLENCE">VIOLENCE</option>
//               <option value="INTIMIDATION">INTIMIDATION</option>
//               <option value="EQUIPMENT_ISSUE">EQUIPMENT_ISSUE</option>
//               <option value="LATE_OPENING">LATE_OPENING</option>
//               <option value="QUEUE_ISSUE">QUEUE_ISSUE</option>
//               <option value="OTHER">OTHER</option>
//             </select>

//             <select
//               value={resolved}
//               onChange={(e) => {
//                 setResolved(e.target.value as any);
//                 setPage(0);
//               }}
//               className="h-9 rounded-lg border bg-white px-3 text-sm font-semibold"
//             >
//               <option value="">All</option>
//               <option value="false">Open</option>
//               <option value="true">Resolved</option>
//             </select>
//           </div>

//           <div className="text-xs text-slate-500">
//             Page {page + 1} / {totalPages}
//           </div>
//         </div>

//         {listQ.isError ? (
//           <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-bold">
//             {friendlyError(listQ.error)}
//           </div>
//         ) : null}

//         <Table
//           columns={[
//             "Type",
//             "County",
//             "District", // ✅ NEW
//             "Center",
//             "Summary",
//             "Evidence",
//             "Status",
//             "Actions",
//           ]}
//           rows={
//             !effectiveOrgId
//               ? [
//                   [
//                     <span key="no-org" className="text-sm text-slate-600">
//                       Tenant orgId missing — cannot load reports.
//                     </span>,
//                     "",
//                     "",
//                     "",
//                     "",
//                     "",
//                     "",
//                     "",
//                   ],
//                 ]
//               : listQ.isLoading
//               ? [
//                   [
//                     <span key="loading" className="text-sm text-slate-600">
//                       Loading…
//                     </span>,
//                     "",
//                     "",
//                     "",
//                     "",
//                     "",
//                     "",
//                     "",
//                   ],
//                 ]
//               : rows
//           }
//         />

//         {/* Pagination */}
//         <div className="mt-3 flex items-center justify-between gap-2">
//           <div className="flex gap-2">
//             <button
//               type="button"
//               className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
//               onClick={() => setPage((p) => Math.max(0, p - 1))}
//               disabled={page <= 0 || listQ.isFetching || !effectiveOrgId}
//             >
//               Prev
//             </button>
//             <button
//               type="button"
//               className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
//               onClick={() => setPage((p) => (p + 1 < totalPages ? p + 1 : p))}
//               disabled={
//                 listQ.isFetching || page + 1 >= totalPages || !effectiveOrgId
//               }
//             >
//               Next
//             </button>
//           </div>
//         </div>

//         <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
//           <Note
//             title="Later behavior"
//             bullets={[
//               "Create report with location selectors (county/district/center).",
//               "Attach evidence (multipart files) and optionally link to a vote_submission.",
//               "Supervisor triage: assign → investigate → close with audit trail.",
//             ]}
//           />
//           <Note
//             title="Schema mapping"
//             bullets={[
//               "observer_report stores incident + metadata.",
//               "Attachments come from multipart evidence upload (or mediaUrl).",
//               "audit_log can record triage actions.",
//             ]}
//           />
//         </div>
//       </Card>

//       {/* ✅ Create/Edit Modal */}
//       <ObserverReportFormModal
//         open={openForm}
//         mode={formMode}
//         busy={createM.isPending || updateM.isPending}
//         canSubmit={canCrud}
//         effectiveOrgId={effectiveOrgId}
//         me={me}
//         counties={counties}
//         districts={districts} // ✅ NEW
//         centers={centers}
//         initial={formMode === "edit" ? editQ.data ?? null : null}
//         onClose={() => setOpenForm(false)}
//         onSubmitCreate={async (req, files) => {
//           await createM.mutateAsync({ req, files });
//         }}
//         onSubmitUpdate={async (id, req, files) => {
//           await updateM.mutateAsync({ id, req, files });
//         }}
//         error={createM.error || updateM.error || editQ.error}
//       />

//       {/* ✅ View Modal */}
//       {openView ? (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/40"
//           onClick={() => setOpenView(false)}
//         >
//           <div
//             className="w-full max-w-xl bg-white rounded-2xl border shadow-xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="p-3 border-b flex items-start justify-between">
//               <div>
//                 <div className="text-base font-extrabold">Observer Report</div>
//                 <div className="text-xs text-slate-500">Details</div>
//               </div>
//               <button
//                 className="h-9 rounded-lg border bg-white px-3 text-sm font-bold"
//                 onClick={() => setOpenView(false)}
//                 type="button"
//               >
//                 Close
//               </button>
//             </div>

//             <div className="p-3">
//               {viewQ.isLoading ? (
//                 <div className="text-sm text-slate-600">Loading…</div>
//               ) : viewQ.isError ? (
//                 <div className="text-sm font-bold text-red-700">
//                   {friendlyError(viewQ.error)}
//                 </div>
//               ) : !viewQ.data ? (
//                 <div className="text-sm text-slate-600">No data.</div>
//               ) : (
//                 <div className="space-y-2 text-sm">
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         Type
//                       </div>
//                       <div className="font-extrabold">{viewQ.data.type}</div>
//                     </div>
//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         Resolved
//                       </div>
//                       <div className="font-extrabold">
//                         {viewQ.data.resolved ? "Yes" : "No"}
//                       </div>
//                     </div>
//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         County
//                       </div>
//                       <div className="font-extrabold">
//                         {viewQ.data.countyName ?? "—"}
//                       </div>
//                     </div>

//                     {/* ✅ NEW: District */}
//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         District
//                       </div>
//                       <div className="font-extrabold">
//                         {(viewQ.data as any).districtName ?? "—"}
//                       </div>
//                     </div>

//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         Center
//                       </div>
//                       <div className="font-extrabold">
//                         {viewQ.data.centerName ?? "—"}
//                       </div>
//                     </div>

//                   </div>

//                   <div className="rounded-xl border p-2">
//                     <div className="text-[11px] font-extrabold text-slate-600">
//                       Description
//                     </div>
//                     <div className="whitespace-pre-wrap">
//                       {viewQ.data.description}
//                     </div>
//                   </div>

//                   {viewQ.data.mediaUrl ? (
//                     <div className="rounded-xl border p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         Media URL
//                       </div>
//                       <div className="break-all">{viewQ.data.mediaUrl}</div>
//                     </div>
//                   ) : null}
//                 </div>
//               )}
//             </div>
//           </div>
//         </div>
//       ) : null}
//     </OpsPageShell>
//   );
// }
