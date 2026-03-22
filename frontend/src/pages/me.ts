

// // ✅ FILE: src/pages/operations/observer-reports/ObserverReportsPage.tsx
// //
// // ✅ UPDATED: Added District support (list column + view modal + form data plumbing)
// // ✅ UPDATED: Added Reporter + Polling Center Name columns on the table
// // ✅ UPDATED: Truncate/ellipsis for Reporter, Center Name, and Description/Summary so table does NOT extend right
// // ✅ UPDATED: Reporter shows FULL NAME (first + last) when fields exist; falls back safely
// // ✅ NEW: SYSTEM dashboard tenant selector (org dropdown) to select a tenant before listing/creating/editing
// //
// // ❗Per request: DO NOT change existing auth/tenant rules or core behavior.
// //    Only ADD tenant dropdown in SYSTEM dashboard mode.
// //    - Tenant dropdown appears ONLY when dashboardMode === "SYSTEM"
// //    - For SYSTEM mode: list/create/edit/delete requires selected tenant org
// //    - For TENANT dashboards: uses currentOrgId as before

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

// // ✅ NEW (tenant dropdown data)
// import {
//   fetchOrganizations,
//   type Organization,
// } from "../../shared/services/organizationService";

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

// /**
//  * ✅ Reporter full name:
//  * Prefer explicit fields if backend provides them:
//  * - observerFirstName, observerLastName
//  * Fall back to observerName, then observerId.
//  */
// function reporterFullName(r: any) {
//   const first = String(
//     r?.observerFirstName ?? r?.observer_first_name ?? ""
//   ).trim();
//   const last = String(
//     r?.observerLastName ?? r?.observer_last_name ?? ""
//   ).trim();

//   const full = `${first} ${last}`.trim();
//   if (full) return full;

//   const name = String(r?.observerName ?? "").trim();
//   if (name) return name;

//   const id = String(r?.observerId ?? "").trim();
//   return id ? `ID: ${id.slice(0, 8)}…` : "—";
// }

// /**
//  * ✅ Table-safe text cell: 1-line clamp + ellipsis + tooltip
//  * - Prevents long strings from expanding table width
//  */
// function ClampCell(props: { text?: any; className?: string }) {
//   const t = String(props.text ?? "").trim();
//   return (
//     <div
//       title={t || ""}
//       className={[
//         "min-w-0 truncate text-lg text-slate-800",
//         props.className ?? "max-w-[240px]",
//       ].join(" ")}
//     >
//       {t || "—"}
//     </div>
//   );
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

//   /**
//    * ✅ NEW: SYSTEM dashboard tenant selector
//    * - On SYSTEM dashboard, currentOrgId may be empty; system admin MUST pick a tenant org to operate on tenant entity.
//    * - We do NOT change your store currentOrgId; we keep selection local to this page.
//    */
//   const isSystemDashboard = dashboardMode === "SYSTEM";
//   const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>("");

//   // tenant scope:
//   // - Tenant dashboards: use currentOrgId as before
//   // - SYSTEM dashboard: use selected org id (required for list/create/edit)
//   const effectiveOrgId = isSystemDashboard
//     ? systemSelectedOrgId || undefined
//     : currentOrgId || undefined;

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

//   /** ---------------- NEW: org dropdown data (SYSTEM only) ---------------- */
//   const orgsQ = useQuery<{ items: Organization[]; totalElements: number }>({
//     enabled: isSystemDashboard,
//     queryKey: ["orgs", "dropdown", "observer-reports", "system"],
//     queryFn: async () => {
//       // fetch enough orgs for dropdown
//       return await fetchOrganizations({
//         page: 0,
//         size: 500,
//         search: "",
//         active: true,
//         // orgType: undefined,
//         orgId: undefined,
//       } as any);
//     },
//     staleTime: 60_000,
//     retry: 1,
//   });

//   const orgOptions = orgsQ.data?.items ?? [];

//   /** ---------------- geo lists for modal ---------------- */
//   const countiesQ = useQuery<CountyDto[]>({
//     queryKey: ["counties", "all", "observer-reports"],
//     queryFn: async () =>
//       (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
//     staleTime: 60_000,
//     retry: 1,
//   });

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

//   // ✅ list requires a tenant org (selected on system dashboard; currentOrgId on tenant dashboards)
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
//       const district = (r as any).districtName ?? "—";

//       const centerCode = r.centerCode ? String(r.centerCode) : "—";
//       const centerName = String(r.centerName ?? "—");

//       const reporter = reporterFullName(r as any);

//       const desc = String(r.description ?? "");
//       const evidence = evidenceLabel(r);
//       const status = r.resolved ? "Resolved" : "Open";

//       return [
//         <Badge key={`t-${r.reportId}`}>{String(r.type ?? "—")}</Badge>,

//         <ClampCell
//           key={`rep-${r.reportId}`}
//           text={reporter}
//           className="max-w-[200px]"
//         />,

//         <ClampCell
//           key={`co-${r.reportId}`}
//           text={county}
//           className="max-w-[180px]"
//         />,
//         <ClampCell
//           key={`di-${r.reportId}`}
//           text={district}
//           className="max-w-[180px]"
//         />,

//         centerCode,

//         <ClampCell
//           key={`cn-${r.reportId}`}
//           text={centerName}
//           className="max-w-[240px]"
//         />,

//         <ClampCell
//           key={`sum-${r.reportId}`}
//           text={desc}
//           className="max-w-[340px]"
//         />,

//         <span
//           key={`e-${r.reportId}`}
//           className={`inline-flex rounded-full px-2 py-0.5 text-base font-extrabold border ${
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
//             <Eye size={16} className="text-red-600" />
//           </button>

//           <button
//             type="button"
//             className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 ${
//               !canCrud ? "opacity-50" : ""
//             }`}
//             disabled={!canCrud}
//             onClick={() => {
//               // ✅ SYSTEM dashboard must pick tenant first (effectiveOrgId required)
//               if (isSystemDashboard && !effectiveOrgId) {
//                 alert("Select a tenant organization first.");
//                 return;
//               }
//               setFormMode("edit");
//               setEditId(String(r.reportId));
//               setOpenForm(true);
//             }}
//             title="Edit"
//           >
//             <Pencil size={16} className="text-green-600" />
//           </button>

//           <button
//             type="button"
//             className={`inline-flex items-center gap-1.5 rounded-lg border bg-white px-2 py-1 ${
//               !canCrud || delM.isPending ? "opacity-50" : ""
//             }`}
//             disabled={!canCrud || delM.isPending}
//             onClick={() => {
//               // ✅ SYSTEM dashboard must pick tenant first
//               if (isSystemDashboard && !effectiveOrgId) {
//                 alert("Select a tenant organization first.");
//                 return;
//               }
//               if (!confirm("Delete this report?")) return;
//               delM.mutate(String(r.reportId));
//             }}
//             title="Delete"
//           >
//             <Trash2 size={18} className="text-red-600" />
//           </button>
//         </div>,
//       ];
//     });
//   }, [items, canCrud, delM.isPending, isSystemDashboard, effectiveOrgId]);

//   return (
//     <OpsPageShell
//       title="Operations • Observer Reports"
//       subtitle={`Actor: ${meName} • Role: ${roleLabel || "—"} • Dashboard: ${
//         dashboardMode ?? "—"
//       } • Tenant(org): ${effectiveOrgId ?? "—"}`}
//       right={<Badge>Evidence-first</Badge>}
//     >
//       <Card
//         title="Observer Reports"
//         right={
//           <div className="flex flex-wrap gap-2">
//             <button
//               className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg font-semibold hover:bg-slate-50 inline-flex items-center gap-2"
//               onClick={() => listQ.refetch()}
//               disabled={!listEnabled || listQ.isFetching}
//               type="button"
//             >
//               <RefreshCw size={18} />
//               Refresh
//             </button>

//             <button
//               className={`rounded-xl border px-3 py-2 text-lg font-extrabold inline-flex items-center gap-2 ${
//                 canCrud
//                   ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
//                   : "bg-white text-slate-700 border-slate-200 opacity-60"
//               }`}
//               type="button"
//               disabled={!canCrud}
//               onClick={() => {
//                 // ✅ SYSTEM dashboard must pick tenant first
//                 if (isSystemDashboard && !effectiveOrgId) {
//                   alert("Select a tenant organization first.");
//                   return;
//                 }
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
//         {/* ✅ NEW: SYSTEM dashboard tenant dropdown */}
//         {isSystemDashboard ? (
//           <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-3">
//             <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
//               <div className="min-w-0">
//                 <div className="text-base font-extrabold text-slate-900">
//                   Select Tenant Organization
//                 </div>
//                 <div className="text-xs text-slate-500">
//                   Observer Reports are tenant-scoped. Choose an org to
//                   list/create/edit reports.
//                 </div>
//               </div>

//               <div className="flex items-center gap-2">
//                 <select
//                   value={systemSelectedOrgId}
//                   onChange={(e) => {
//                     setSystemSelectedOrgId(e.target.value);
//                     setPage(0);
//                   }}
//                   className="h-10 w-full sm:w-[320px] rounded-xl border bg-white px-3 text-base font-semibold"
//                   disabled={orgsQ.isLoading}
//                 >
//                   <option value="">— Select tenant —</option>
//                   {orgOptions.map((o) => (
//                     <option key={o.orgId} value={o.orgId}>
//                       {o.orgName}
//                     </option>
//                   ))}
//                 </select>

//                 <button
//                   type="button"
//                   className="h-10 rounded-xl border bg-white px-3 text-sm font-extrabold hover:bg-slate-50 inline-flex items-center gap-2"
//                   onClick={() => orgsQ.refetch()}
//                   disabled={orgsQ.isFetching}
//                   title="Reload tenants"
//                 >
//                   <RefreshCw size={16} />
//                   Reload
//                 </button>
//               </div>
//             </div>

//             {orgsQ.isError ? (
//               <div className="mt-2 text-sm font-bold text-red-700">
//                 {friendlyError(orgsQ.error)}
//               </div>
//             ) : null}

//             {!systemSelectedOrgId ? (
//               <div className="mt-2 text-base font-bold text-amber-900 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
//                 Select a tenant to load reports.
//               </div>
//             ) : null}
//           </div>
//         ) : null}

//         {/* Existing warning (kept) - but will also show for SYSTEM until tenant selected */}
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
//               className="h-9 rounded-lg border bg-white px-3 text-base w-[220px]"
//               disabled={!effectiveOrgId}
//             />

//             <select
//               value={type}
//               onChange={(e) => {
//                 setType(e.target.value as any);
//                 setPage(0);
//               }}
//               className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
//               disabled={!effectiveOrgId}
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
//               className="h-9 rounded-lg border bg-white px-3 text-base font-semibold"
//               disabled={!effectiveOrgId}
//             >
//               <option value="">All</option>
//               <option value="false">Open</option>
//               <option value="true">Resolved</option>
//             </select>
//           </div>

//           <div className="text-sm text-slate-500">
//             Page {page + 1} / {totalPages}
//           </div>
//         </div>

//         {listQ.isError ? (
//           <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-base font-bold">
//             {friendlyError(listQ.error)}
//           </div>
//         ) : null}

//         <Table
//           columns={[
//             "Report Type",
//             "Reporter",
//             "County",
//             "District",
//             "Center Code",
//             "Center Name",
//             "Description",
//             "Evidence",
//             "Status",
//             "Actions",
//           ]}
//           rows={
//             !effectiveOrgId
//               ? [
//                   [
//                     <span key="no-org" className="text-base text-slate-600">
//                       Select a tenant organization to load reports.
//                     </span>,
//                     "",
//                     "",
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
//         districts={districts}
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
//             className="w-full max-w-3xl bg-white rounded-2xl border shadow-xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="p-3 border-b flex items-start justify-between">
//               <div>
//                 <div className="text-xl font-extrabold">Observer Report</div>
//                 <div className="text-sm text-slate-500">Details</div>
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
//                 <div className="space-y-2 text-base">
//                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-[11px] font-extrabold text-slate-600">
//                         Report Type
//                       </div>
//                       <div className="font-bold">{viewQ.data.type}</div>
//                     </div>

//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-base font-extrabold text-slate-600">
//                         Resolved
//                       </div>

//                       <div className={`font-bold ${viewQ.data.resolved ? "text-green-600" : "text-red-600"}`}>
//                         {viewQ.data.resolved ? "✓ Yes" : "✕ No"}
//                       </div>
//                     </div>

//                     {/* ✅ Reporter */}
//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-sm font-extrabold text-slate-600">
//                         Reporter
//                       </div>
//                       <div className="font-bold">
//                         {reporterFullName(viewQ.data as any)}
//                       </div>
//                     </div>

//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-sm font-extrabold text-slate-600">
//                         County
//                       </div>
//                       <div className="font-bold">
//                         {viewQ.data.countyName ?? "—"}
//                       </div>
//                     </div>

//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-sm font-extrabold text-slate-600">
//                         District
//                       </div>
//                       <div className="font-bold">
//                         {(viewQ.data as any).districtName ?? "—"}
//                       </div>
//                     </div>

//                     <div className="rounded-xl border bg-slate-50 p-2">
//                       <div className="text-sm font-extrabold text-slate-600">
//                         Center Code
//                       </div>
//                       <div className="font-bold">
//                         {viewQ.data.centerCode ?? "—"}
//                       </div>
//                     </div>

//                     <div className="rounded-xl border bg-slate-50 p-2 sm:col-span-2">
//                       <div className="text-sm font-extrabold text-slate-600">
//                         Center
//                       </div>
//                       <div className="font-bold">
//                         {viewQ.data.centerName ?? "—"}
//                       </div>
//                     </div>
//                   </div>

//                   <div className="rounded-xl border p-2">
//                     <div className="text-sm font-extrabold text-slate-600">
//                       Description
//                     </div>
//                     <div className="whitespace-pre-wrap">
//                       {viewQ.data.description}
//                     </div>
//                   </div>

//                   {viewQ.data.mediaUrl ? (
//                     <div className="rounded-xl border p-2">
//                       <div className="text-base font-extrabold text-slate-600">
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
