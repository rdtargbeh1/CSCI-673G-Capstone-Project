


// ✅ FILE: src/pages/operations/TallySheetsPage.tsx
// ✅ TENANT-SCOPE FIX:
// - Tally sheets require org context.
// - SYSTEM must select a tenant org before viewing anything.
// - TENANT/NEC must have currentOrgId (or selected submission orgId).
// - All requests pass effectiveOrgId into searchSubmissions + listTallySheetsBySubmission.

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ExternalLink, RefreshCw, X } from "lucide-react";

import { OpsPageShell, Card, Note } from "./shared/ops-ui";

import {
  searchSubmissions,
  type VoteSubmissionDto,
  type PageResult,
} from "../../shared/services/voteSubmissionService";

import {
  listTallySheetsBySubmission,
  downloadTallySheetBlob,
  type TallySheetDto,
} from "../../shared/services/tallySheetService";

import { fetchCounties, type CountyDto } from "../../shared/services/countyService";
import { fetchDistricts, type DistrictDto } from "../../shared/services/districtService";
import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../shared/services/pollingCenterService";
import {
  fetchPollingPlaces,
  type PollingPlaceDto,
} from "../../shared/services/pollingPlaceService";

import {
  fetchOrganizations,
  type Organization,
} from "../../shared/services/organizationService";

import { useAuthStore } from "../../shared/store/authStore";

type OrgDto = { orgId: string; orgName: string };

function safeDate(dt?: string) {
  if (!dt) return "—";
  const d = new Date(dt);
  return Number.isNaN(d.getTime()) ? dt : d.toLocaleString();
}

function saveBlob(blob: Blob, fileName: string) {
  const a = document.createElement("a");
  const objectUrl = window.URL.createObjectURL(blob);
  a.href = objectUrl;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function guessExt(url: string) {
  try {
    const clean = url.split("?")[0];
    const last = clean.split("/").pop() || "";
    const dot = last.lastIndexOf(".");
    if (dot > 0) return last.slice(dot + 1).toLowerCase();
  } catch {}
  return "jpg";
}

export default function TallySheetsPage() {
  const mode = useAuthStore((s) => s.dashboardMode); // "SYSTEM" | "NEC" | "TENANT"
  const currentOrgId = useAuthStore((s) => s.currentOrgId);

  // ✅ SYSTEM tenant selection (required for tenant-scoped pages)
  const [systemSelectedOrgId, setSystemSelectedOrgId] = useState<string>("");

  const orgsQ = useQuery<OrgDto[], Error>({
    enabled: mode === "SYSTEM",
    queryKey: ["orgs", "tenant-list", "tally-sheets"],
    queryFn: async () => {
      const res = await fetchOrganizations({
        page: 0,
        size: 500,
        active: true,
        orgType: undefined,
        orgId: undefined,
        search: undefined,
      });

      return (res.items ?? []).map((o: Organization) => ({
        orgId: o.orgId,
        orgName: o.orgName,
      }));
    },
    staleTime: 60_000,
    retry: 1,
  });

  const orgs = orgsQ.data ?? [];

  // ✅ Effective org id (matches SubmissionsTab logic)
  const effectiveOrgId =
    mode === "SYSTEM"
      ? systemSelectedOrgId || undefined
      : currentOrgId || undefined;

  // queue filters
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);

  // geo cascade filters
  const [countyId, setCountyId] = useState<string>("");
  const [districtId, setDistrictId] = useState<string>("");
  const [centerId, setCenterId] = useState<string>("");
  const [placeId, setPlaceId] = useState<string>("");

  const [selected, setSelected] = useState<VoteSubmissionDto | null>(null);

  // ✅ reset page/selection when org changes (SYSTEM select)
  useEffect(() => {
    setPage(0);
    setSelected(null);
  }, [effectiveOrgId]);

  // ✅ Counties
  const countiesQ = useQuery<{ items: CountyDto[]; totalPages: number }, Error>({
    queryKey: ["counties", "all", "tally", effectiveOrgId ?? "no-org"],
    queryFn: () => fetchCounties({ page: 0, size: 200 }),
    enabled: Boolean(effectiveOrgId), // tenant-scope: only when org exists
    placeholderData: (prev) => prev,
  });
  const counties = countiesQ.data?.items ?? [];

  // ✅ Districts by county
  const districtsQ = useQuery<{ items: DistrictDto[]; totalPages: number }, Error>({
    queryKey: ["districts", "tally", effectiveOrgId ?? "no-org", countyId],
    queryFn: () => fetchDistricts({ page: 0, size: 200, countyId: countyId || undefined }),
    enabled: Boolean(effectiveOrgId) && Boolean(countyId),
    placeholderData: (prev) => prev,
  });
  const districts = districtsQ.data?.items ?? [];

  // ✅ Centers
  const centersQ = useQuery<{ items: PollingCenterDto[]; totalPages: number }, Error>({
    queryKey: ["centers", "tally", effectiveOrgId ?? "no-org", countyId, districtId],
    queryFn: () =>
      fetchPollingCenters({
        page: 0,
        size: 200,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
      }),
    enabled: Boolean(effectiveOrgId) && Boolean(countyId) && Boolean(districtId),
    placeholderData: (prev) => prev,
  });
  const centers = centersQ.data?.items ?? [];

  // ✅ Places
  const placesQ = useQuery<{ items: PollingPlaceDto[]; totalPages: number }, Error>({
    queryKey: ["places", "tally", effectiveOrgId ?? "no-org", centerId],
    queryFn: () =>
      fetchPollingPlaces({
        page: 0,
        size: 200,
        centerId: centerId || undefined,
      }),
    enabled: Boolean(effectiveOrgId) && Boolean(centerId),
    placeholderData: (prev) => prev,
  });
  const places = placesQ.data?.items ?? [];

  // cascade resets
  function onCountyChange(v: string) {
    setCountyId(v);
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setPage(0);
    setSelected(null);
  }
  function onDistrictChange(v: string) {
    setDistrictId(v);
    setCenterId("");
    setPlaceId("");
    setPage(0);
    setSelected(null);
  }
  function onCenterChange(v: string) {
    setCenterId(v);
    setPlaceId("");
    setPage(0);
    setSelected(null);
  }
  function onPlaceChange(v: string) {
    setPlaceId(v);
    setPage(0);
    setSelected(null);
  }
  function clearGeo() {
    setCountyId("");
    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setPage(0);
    setSelected(null);
  }

  // ✅ Queue should be disabled unless we have tenant org context
  const queueEnabled = Boolean(effectiveOrgId);

  // ✅ Submissions queue (tenant-scoped: always pass orgId)
  const subsQ = useQuery<PageResult<VoteSubmissionDto>, Error>({
    enabled: queueEnabled,
    queryKey: [
      "tallySheetsQueue",
      mode,
      effectiveOrgId ?? "no-org",
      q,
      page,
      countyId,
      districtId,
      centerId,
      placeId,
    ],
    queryFn: () =>
      searchSubmissions({
        orgId: effectiveOrgId, // ✅ critical: tenant scope enforced
        page,
        size: 15,
        q: q.trim() || undefined,
        countyId: countyId || undefined,
        districtId: districtId || undefined,
        centerId: centerId || undefined,
        placeId: placeId || undefined,
      }),
    placeholderData: (prev) => prev,
    retry: 1,
  });

  const submissions = subsQ.data?.items ?? [];
  const totalPages = subsQ.data?.totalPages ?? 1;

  // ✅ Use org context from selected submission if present (still tenant-scoped)
  const orgForSheets =
    selected?.orgId || effectiveOrgId; // both tenant-safe
  const sheetsEnabled = Boolean(selected?.submissionId) && Boolean(orgForSheets);

  const sheetsQ = useQuery<TallySheetDto[], Error>({
    enabled: sheetsEnabled,
    queryKey: ["tallySheetsBySubmission", selected?.submissionId ?? null, orgForSheets ?? null, mode],
    queryFn: () => listTallySheetsBySubmission(selected!.submissionId, orgForSheets!),
    retry: false,
  });

  const uploads = useMemo(() => sheetsQ.data ?? [], [sheetsQ.data]);
  const hasEvidence = uploads.length > 0;

  return (
    <OpsPageShell
      title="Operations • Tally Sheets"
      subtitle="Tenant-scoped: select tenant (SYSTEM) or use current org (NEC/TENANT), then filter by location and download uploads."
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* LEFT */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Card
            title="Evidence Queue"
            right={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => subsQ.refetch()}
                  disabled={!queueEnabled || subsQ.isFetching}
                  className={`h-9 rounded-lg border bg-white px-3 text-lg font-extrabold hover:bg-slate-50 inline-flex items-center gap-2 ${
                    !queueEnabled || subsQ.isFetching ? "opacity-60" : ""
                  }`}
                >
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={clearGeo}
                  disabled={!queueEnabled}
                  className={`h-9 rounded-lg border bg-white px-3 text-sm font-extrabold hover:bg-slate-50 inline-flex items-center gap-2 ${
                    !queueEnabled ? "opacity-60" : ""
                  }`}
                >
                  <X size={16} />
                  Clear
                </button>
              </div>
            }
          >
            {/* ✅ SYSTEM tenant selector */}
            {mode === "SYSTEM" ? (
              <div className="mb-3">
                <label className="block text-sm font-extrabold text-slate-600">
                  Tenant (required in SYSTEM mode)
                </label>
                <select
                  value={systemSelectedOrgId}
                  onChange={(e) => setSystemSelectedOrgId(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border px-3 text-base font-semibold bg-white"
                >
                  <option value="">-- Select tenant --</option>
                  {orgs.map((o) => (
                    <option key={o.orgId} value={o.orgId}>
                      {o.orgName}
                    </option>
                  ))}
                </select>

                {!effectiveOrgId ? (
                  <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                    <div className="font-extrabold">Tenant required</div>
                    <div className="mt-1 text-sm">
                      Tally sheets are tenant-scoped. Select a tenant to view submissions and downloads.
                    </div>
                  </div>
                ) : null}
              </div>
            ) : !effectiveOrgId ? (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-base text-amber-900">
                <div className="font-extrabold">Missing org context</div>
                <div className="mt-1 text-xs">
                  NEC/TENANT mode requires <span className="font-mono">currentOrgId</span>. Fix your org selection / auth context.
                </div>
              </div>
            ) : null}

            {/* Geo filters (enabled only when org exists) */}
            <div className={`grid grid-cols-1 md:grid-cols-4 gap-2 ${!queueEnabled ? "opacity-60 pointer-events-none" : ""}`}>
              <div>
                <label className="block text-base font-extrabold text-slate-600">County</label>
                <select
                  value={countyId}
                  onChange={(e) => onCountyChange(e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border px-3 text-base font-semibold bg-white"
                >
                  <option value="">All Counties</option>
                  {counties.map((c) => (
                    <option key={c.countyId} value={c.countyId}>
                      {c.countyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-600">District</label>
                <select
                  value={districtId}
                  onChange={(e) => onDistrictChange(e.target.value)}
                  disabled={!countyId}
                  className={`mt-1 h-10 w-full rounded-xl border px-3 text-base font-semibold bg-white ${
                    !countyId ? "opacity-60" : ""
                  }`}
                >
                  <option value="">{countyId ? "All Districts" : "Select County"}</option>
                  {districts.map((d) => (
                    <option key={d.districtId} value={d.districtId}>
                      {d.districtName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-600">Center</label>
                <select
                  value={centerId}
                  onChange={(e) => onCenterChange(e.target.value)}
                  disabled={!countyId || !districtId}
                  className={`mt-1 h-10 w-full rounded-xl border px-3 text-base font-semibold bg-white ${
                    !countyId || !districtId ? "opacity-60" : ""
                  }`}
                >
                  <option value="">{countyId && districtId ? "All Centers" : "Select District"}</option>
                  {centers.map((c) => (
                    <option key={c.centerId} value={c.centerId}>
                      {c.centerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-base font-extrabold text-slate-600">Place</label>
                <select
                  value={placeId}
                  onChange={(e) => onPlaceChange(e.target.value)}
                  disabled={!centerId}
                  className={`mt-1 h-10 w-full rounded-xl border px-3 text-base font-semibold bg-white ${
                    !centerId ? "opacity-60" : ""
                  }`}
                >
                  <option value="">{centerId ? "All Places" : "Select Center"}</option>
                  {places.map((p) => (
                    <option key={p.placeId} value={p.placeId}>
                      {p.label ?? `Place ${p.placeNumber}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search */}
            <div className={`mt-3 flex gap-2 ${!queueEnabled ? "opacity-60 pointer-events-none" : ""}`}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search submissions (agent, contest, center, etc.)"
                className="h-10 flex-1 rounded-xl border px-3 text-base font-semibold outline-none focus:ring-2 focus:ring-blue-200"
              />
              <button
                type="button"
                onClick={() => {
                  setPage(0);
                  subsQ.refetch();
                }}
                className="h-10 rounded-xl bg-slate-900 px-4 text-base font-extrabold text-white hover:bg-slate-800"
              >
                Search
              </button>
            </div>

            <div className="mt-3 rounded-xl border overflow-hidden">
              <div className="bg-slate-50 px-3 py-2 text-base font-extrabold text-slate-600">
                Submissions
              </div>

              {!queueEnabled ? (
                <div className="p-3 text-sm text-slate-600">
                  Select an organization to view submissions.
                </div>
              ) : subsQ.isLoading ? (
                <div className="p-3 text-sm text-slate-600">Loading…</div>
              ) : !submissions.length ? (
                <div className="p-3 text-sm text-slate-600">No submissions found.</div>
              ) : (
                <div className="divide-y">
                  {submissions.map((s) => {
                    const active = selected?.submissionId === s.submissionId;
                    return (
                      <button
                        key={s.submissionId}
                        type="button"
                        onClick={() => setSelected(s)}
                        className={`w-full text-left p-3 hover:bg-slate-50 ${
                          active ? "bg-blue-50" : "bg-white"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-lg font-bold truncate">
                              {s.contestName ?? "Contest"} • {s.centerName ?? "Center"}
                            </div>
                            <div className="mt-1 text-sm text-slate-600">
                              {/* {s.countyName ?? "—"} • {s.districtName ?? "—"} •{" "} */}
                              {s.placeLabel ?? "—"}
                            </div>
                          </div>

                          <span className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold border bg-white">
                            {s.status ?? "—"}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="h-9 rounded-lg border bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
                disabled={!queueEnabled || page === 0}
              >
                Prev
              </button>

              <div className="text-sm text-slate-600">
                Page {page + 1} / {queueEnabled ? totalPages : 1}
              </div>

              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="h-9 rounded-lg border bg-white px-3 text-sm font-extrabold hover:bg-slate-50"
                disabled={!queueEnabled || page + 1 >= totalPages}
              >
                Next
              </button>
            </div>
          </Card>
        </div>

        {/* RIGHT */}
        <div className="lg:col-span-1 flex flex-col gap-3">
          <Card title="Selected Submission • Evidence">
            {!selected ? (
              <div className="text-sm text-slate-600">
                Select a submission from the queue to view uploaded tally sheets.
              </div>
            ) : !orgForSheets ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="font-extrabold">Missing org context</div>
                <div className="mt-1 text-xs">
                  Tally sheets are tenant-scoped and require orgId.
                </div>
              </div>
            ) : sheetsQ.isLoading ? (
              <div className="text-sm text-slate-600">Loading uploads…</div>
            ) : sheetsQ.isError ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                Failed to load tally sheets for this submission.
              </div>
            ) : !hasEvidence ? (
              <div className="rounded-xl border border-dashed bg-slate-50 p-3 text-sm text-slate-700">
                <div className="font-extrabold">No uploads found</div>
                <div className="mt-1 text-xs text-slate-600">
                  No tally sheet images were uploaded for this submission.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-extrabold">Uploads ({uploads.length})</div>
                  <span className="inline-flex rounded-full px-2 py-0.5 text-[14px] font-extrabold border bg-green-50 text-green-700 border-green-200">
                    Attached
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {uploads.map((u: TallySheetDto, idx: number) => {
                    const ext = guessExt(u.imageUrl);
                    const fileName = `tally_${u.submissionId}_${idx + 1}.${ext}`;

                    return (
                      <div key={u.uploadId} className="rounded-xl border overflow-hidden">
                        <div className="bg-slate-50 p-2">
                          <img
                            src={u.imageUrl}
                            alt="Tally Sheet"
                            className="w-full rounded-lg border object-cover"
                          />
                        </div>

                        <div className="p-3">
                          <div className="text-sm text-slate-600">
                            Uploaded: {safeDate(u.dateUploaded)}
                          </div>

                          <div className="mt-2 flex items-center gap-2">
                            <a
                              href={u.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="h-9 flex-1 rounded-lg border bg-white px-3 text-base font-extrabold hover:bg-slate-50 inline-flex items-center justify-center gap-2"
                            >
                              <ExternalLink size={18} />
                              View
                            </a>

                            <button
                              type="button"
                              onClick={async () => {
                                const blob = await downloadTallySheetBlob({
                                  url: u.imageUrl,
                                  orgId: orgForSheets, // ✅ always present here
                                });
                                saveBlob(blob, fileName);
                              }}
                              className="h-9 flex-1 rounded-lg bg-slate-900 px-3 text-base font-extrabold text-white hover:bg-slate-800 inline-flex items-center justify-center gap-2"
                            >
                              <Download size={18} />
                              Download
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <Card title="API Notes">
            <Note
              title="Tenant-scope rules"
              bullets={[
                "SYSTEM must select a tenant orgId before fetching submissions or tally sheets.",
                "NEC/TENANT uses currentOrgId.",
                "Queue uses searchSubmissions({ orgId, countyId, districtId, centerId, placeId }).",
                "Evidence uses listTallySheetsBySubmission(submissionId, orgId).",
              ]}
            />
          </Card>
        </div>
      </div>
    </OpsPageShell>
  );
}

