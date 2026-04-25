

// //// SubmissionFormModal.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  UploadCloud,
  X,
  Image as ImageIcon,
  FileText,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import type { ElectionDto } from "../../../../../shared/services/electionService";
import type { ContestDto } from "../../../../../auth/contestTypes";

import {
  fetchCounties,
  type CountyDto,
} from "../../../../../shared/services/countyService";

import {
  fetchDistrictsByCounty,
  type DistrictDto,
} from "../../../../../shared/services/districtService";

import {
  fetchPollingCenters,
  type PollingCenterDto,
} from "../../../../../shared/services/pollingCenterService";

import {
  fetchPollingPlaces,
  type PollingPlaceDto,
} from "../../../../../shared/services/pollingPlaceService";

import {
  listOptionsByContest,
  type ContestOptionDto,
} from "../../../../../shared/services/contestOptionService";

import {
  createSubmissionMultipart,
  getSubmission,
  updateSubmissionJson,
  updateSubmissionMultipart,
  flagSubmission,
  type VoteSubmissionDto,
  type VoteSubmissionCreateRequest,
  type VoteSubmissionUpdateRequest,
} from "../../../../../shared/services/voteSubmissionService";

import { fetchMe } from "../../../../../shared/services/userService";
import type { UserDto } from "../../../../../auth/userTypes";

import {
  searchPlaceAllocations,
  type PollingPlaceAllocationDto,
} from "../../../../../shared/services/pollingPlaceAllocationService";

/** helpers */
function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function friendlyError(err: any) {
  return (
    safeStr(err?.response?.data?.message) ||
    safeStr(err?.response?.data?.error) ||
    safeStr(err?.message) ||
    "Request failed."
  );
}
function sumVotes(map: Record<string, number>) {
  return Object.values(map ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
}
function userFullName(u: any) {
  const fn = String(u?.firstName ?? "").trim();
  const ln = String(u?.lastName ?? "").trim();
  const nm = `${fn} ${ln}`.trim();
  return nm || String(u?.userName ?? "—");
}
function initials(u: any) {
  const a = String(u?.firstName ?? "").trim().slice(0, 1);
  const b = String(u?.lastName ?? "").trim().slice(0, 1);
  const s = `${a}${b}`.toUpperCase();
  return s || "U";
}
function placeLabel(p: any): string {
  return (
    String(p?.label ?? "") ||
    String(p?.placeLabel ?? "") ||
    (p?.placeNumber != null ? `Place ${p.placeNumber}` : "") ||
    String(p?.code ?? "") ||
    "—"
  );
}
function clampNum(n: any) {
  const v = Number(n);
  if (!isFinite(v) || v < 0) return 0;
  return Math.floor(v);
}

export type SubmissionFormMode = "create" | "edit";

export default function SubmissionFormModal(props: {
  mode: SubmissionFormMode;
  open: boolean;
  onClose: () => void;
  effectiveOrgId?: string;
  dashboardMode?: string;
  user: any;
  agentId: string;
  canCreate: boolean;
  electionId: string;
  elections: ElectionDto[];
  contests: ContestDto[];
  submissionId?: string;
  onSaved: () => void | Promise<void>;
}) {
  const isCreate = props.mode === "create";
  const isEdit = props.mode === "edit";
  const visible = Boolean(props.open);

  const meQ = useQuery<UserDto>({
    enabled: visible && Boolean(props.effectiveOrgId),
    queryKey: ["users", "me", props.effectiveOrgId],
    queryFn: () => fetchMe(props.effectiveOrgId as string),
    staleTime: 60_000,
    retry: 1,
  });

  const agentUser = meQ.data ?? props.user;
  const agentName = userFullName(agentUser);
  const agentInitials = initials(agentUser);
  const actorUserId = (agentUser as any)?.userId ?? props.agentId;

  const countiesQ = useQuery<CountyDto[]>({
    enabled: visible && isCreate,
    queryKey: ["counties", "modal-all"],
    queryFn: async () =>
      (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
    staleTime: 60_000,
    retry: 1,
  });
  const counties = countiesQ.data ?? [];

  const [mCounty, setMCounty] = useState<string>("");
  const mDistrictsQ = useQuery<DistrictDto[]>({
    enabled: visible && isCreate && Boolean(mCounty),
    queryKey: ["districts", "modal", mCounty],
    queryFn: async () =>
      (await fetchDistrictsByCounty(mCounty)) as DistrictDto[],
    staleTime: 60_000,
    retry: 1,
  });
  const mDistricts = mDistrictsQ.data ?? [];
  const [mDistrict, setMDistrict] = useState<string>("");

  const mCentersQ = useQuery<PollingCenterDto[]>({
    enabled: visible && isCreate && (Boolean(mCounty) || Boolean(mDistrict)),
    queryKey: ["polling-centers", "modal", mCounty, mDistrict],
    queryFn: async () => {
      const p = await fetchPollingCenters({
        page: 0,
        size: 500,
        countyId: mCounty || undefined,
        districtId: mDistrict || undefined,
      });
      return p.items as PollingCenterDto[];
    },
    staleTime: 60_000,
    retry: 1,
  });
  const mCenters = mCentersQ.data ?? [];

  const [selectedCenter, setSelectedCenter] = useState<string>("");
  const mPlacesQ = useQuery<PollingPlaceDto[]>({
    enabled: visible && isCreate && Boolean(selectedCenter),
    queryKey: ["polling-places", "modal", selectedCenter],
    queryFn: async () =>
      (
        await fetchPollingPlaces({
          page: 0,
          size: 2000,
          centerId: selectedCenter,
        })
      ).items as PollingPlaceDto[],
    staleTime: 60_000,
    retry: 1,
  });
  const mPlaces = mPlacesQ.data ?? [];
  const [selectedPlace, setSelectedPlace] = useState<string>("");

  const [selectedContest, setSelectedContest] = useState<string>("");
  const contestOptionsQ = useQuery<ContestOptionDto[]>({
    enabled: visible && Boolean(selectedContest),
    queryKey: ["contest-options", "modal", selectedContest],
    queryFn: () =>
      listOptionsByContest({
        contestId: selectedContest,
        onlyActive: true,
      }) as any,
    staleTime: 60_000,
    retry: 1,
  });

  const candidateOptions = useMemo(() => {
    const opts = contestOptionsQ.data ?? [];
    return (opts as any[])
      .filter((o) => String(o?.optionType ?? "").toUpperCase() === "CANDIDATE")
      .sort((a, b) => (a.optionOrder ?? 0) - (b.optionOrder ?? 0));
  }, [contestOptionsQ.data]);

  const [candidateVotes, setCandidateVotes] = useState<Record<string, number>>(
    {}
  );
  const [ballotsReceived, setBallotsReceived] = useState<number | "">("");
  const [invalidBallots, setInvalidBallots] = useState<number | "">("");
  const [rejectedBallots, setRejectedBallots] = useState<number | "">("");
  const [spoiledBallots, setSpoiledBallots] = useState<number | "">("");
  const [unmarkedBallots, setUnmarkedBallots] = useState<number | "">("");
  const [unusedBallots, setUnusedBallots] = useState<number | "">("");

  const [expectedRegisteredVoters, setExpectedRegisteredVoters] = useState<
    number | null
  >(null);
  const [expectedBallotsIssued, setExpectedBallotsIssued] = useState<
    number | null
  >(null);

  const [flagChecked, setFlagChecked] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const [comments, setComments] = useState<string>("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<
    Array<{ name: string; url?: string; type: string }>
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const created: Array<{ name: string; url?: string; type: string }> = [];
    for (const f of files) {
      if (f.type.startsWith("image/")) {
        const u = URL.createObjectURL(f);
        created.push({ name: f.name, url: u, type: f.type });
      } else {
        created.push({
          name: f.name,
          type: f.type || "application/octet-stream",
        });
      }
    }
    setPreviews(created);
    return () => {
      for (const p of created) if (p.url) URL.revokeObjectURL(p.url);
    };
  }, [files]);

  function addFiles(newFiles: File[]) {
    setFiles((cur) => {
      const seen = new Set(cur.map((f) => `${f.name}:${f.size}`.toLowerCase()));
      const out = [...cur];
      for (const f of newFiles) {
        const k = `${f.name}:${f.size}`.toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          out.push(f);
        }
      }
      return out;
    });
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
  }

  function onDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function removeFile(index: number) {
    setFiles((cur) => cur.filter((_, i) => i !== index));
  }

  function openFileDialog() {
    fileInputRef.current?.click();
  }

  const validVotes = useMemo(() => sumVotes(candidateVotes), [candidateVotes]);

  const ballotsInBoxNumber = useMemo(() => {
    return (
      validVotes +
      (Number(invalidBallots) || 0) +
      (Number(rejectedBallots) || 0) +
      (Number(unmarkedBallots) || 0)
    );
  }, [validVotes, invalidBallots, rejectedBallots, unmarkedBallots]);

  const invalidTotalNumber = useMemo(() => {
    return (
      (Number(invalidBallots) || 0) +
      (Number(rejectedBallots) || 0) +
      (Number(unmarkedBallots) || 0)
    );
  }, [invalidBallots, rejectedBallots, unmarkedBallots]);

  const outsideBoxNumber = useMemo(() => {
    return (Number(unusedBallots) || 0) + (Number(spoiledBallots) || 0);
  }, [unusedBallots, spoiledBallots]);

  const exceedsIssued =
    expectedBallotsIssued != null && ballotsInBoxNumber > expectedBallotsIssued;

  const exceedsRegistered =
    expectedRegisteredVoters != null &&
    ballotsInBoxNumber > expectedRegisteredVoters;

  useEffect(() => {
    if (!visible || !isCreate) return;
    setGeoStatus("");
    setLatitude("");
    setLongitude("");
    if (!("geolocation" in navigator)) {
      setGeoStatus("Geolocation not supported.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude));
        setLongitude(Number(pos.coords.longitude));
        setGeoStatus("Location captured.");
      },
      (err) => setGeoStatus(err?.message || "Location unavailable."),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
    );
  }, [visible, isCreate]);

  useEffect(() => {
    if (!visible) return;
    setAdvancedOpen(false);
    setFiles([]);
    setPreviews([]);
    if (isCreate) {
      setMCounty("");
      setMDistrict("");
      setSelectedCenter("");
      setSelectedPlace("");
      setSelectedContest("");
      setCandidateVotes({});
      setBallotsReceived("");
      setInvalidBallots("");
      setRejectedBallots("");
      setSpoiledBallots("");
      setUnmarkedBallots("");
      setUnusedBallots("");
      setComments("");
      setExpectedRegisteredVoters(null);
      setExpectedBallotsIssued(null);
      setFlagChecked(false);
      setFlagReason("");
    }
  }, [visible, isCreate]);

  useEffect(() => {
    if (!visible || !isCreate) return;
    setMDistrict("");
    setSelectedCenter("");
    setSelectedPlace("");
    setExpectedRegisteredVoters(null);
    setExpectedBallotsIssued(null);
  }, [mCounty, visible, isCreate]);

  useEffect(() => {
    if (!visible || !isCreate) return;
    setSelectedCenter("");
    setSelectedPlace("");
    setExpectedRegisteredVoters(null);
    setExpectedBallotsIssued(null);
  }, [mDistrict, visible, isCreate]);

  useEffect(() => {
    if (!visible) return;
    if (!isCreate) return;
    setCandidateVotes({});
  }, [selectedContest, visible, isCreate]);

  const editQ = useQuery<VoteSubmissionDto>({
    enabled: visible && isEdit && Boolean(props.submissionId),
    queryKey: ["vote-submission", "detail", props.submissionId],
    queryFn: () => getSubmission(props.submissionId as string),
    staleTime: 0,
    retry: 1,
  });

  const editStatus = String((editQ.data as any)?.status ?? "").toUpperCase();
  const isFlagged = editStatus === "FLAGGED";
  const isDraft = editStatus === "DRAFT";

  useEffect(() => {
    if (!visible || !isEdit) return;
    const s: any = editQ.data;
    if (!s) return;

    setSelectedContest(String(s.contestId ?? ""));
    setCandidateVotes(s.candidateVotes ?? {});
    setBallotsReceived(s.ballotsReceived ?? "");
    setInvalidBallots(s.invalidBallots ?? "");
    setRejectedBallots(s.rejectedBallots ?? "");
    setSpoiledBallots(s.spoiledBallots ?? "");
    setUnmarkedBallots(s.unmarkedBallots ?? "");
    setUnusedBallots(s.unusedBallots ?? "");
    setComments(s.comments ?? "");
    setLatitude(s.latitude ?? "");
    setLongitude(s.longitude ?? "");
    setFiles([]);
    setPreviews([]);

    setExpectedRegisteredVoters(
      typeof s.registeredVoters === "number" ? s.registeredVoters : null
    );
    setExpectedBallotsIssued(
      typeof s.ballotsIssued === "number" ? s.ballotsIssued : null
    );

    const st = String(s.status ?? "").toUpperCase();
    const flaggedNow = st === "FLAGGED";
    setFlagChecked(flaggedNow);

    const c = String(s.comments ?? "");
    if (flaggedNow && c.toLowerCase().startsWith("[flagged]")) {
      setFlagReason(c.replace(/^\[flagged\]\s*/i, "").trim());
    } else {
      setFlagReason("");
    }
  }, [visible, isEdit, editQ.data]);

  const placeAllocQ = useQuery<PollingPlaceAllocationDto | null>({
    enabled:
      visible &&
      isCreate &&
      Boolean(props.electionId) &&
      Boolean(selectedPlace),
    queryKey: ["place-allocation", "by-place", props.electionId, selectedPlace],
    queryFn: async () => {
      const page = await searchPlaceAllocations({
        electionId: props.electionId,
        placeId: selectedPlace,
        page: 0,
        size: 1,
      });
      return page.items?.[0] ?? null;
    },
    staleTime: 30_000,
    retry: 1,
  });

  useEffect(() => {
    if (!visible || !isCreate) return;
    if (!selectedPlace) return;

    const alloc = placeAllocQ.data;
    if (alloc) {
      setExpectedRegisteredVoters(
        typeof alloc.registeredVoters === "number"
          ? alloc.registeredVoters
          : null
      );
      setExpectedBallotsIssued(
        alloc.ballotsIssued == null ? null : Number(alloc.ballotsIssued)
      );
    } else {
      setExpectedRegisteredVoters(null);
      setExpectedBallotsIssued(null);
    }
  }, [visible, isCreate, selectedPlace, placeAllocQ.data]);

  useEffect(() => {
    if (!visible || !isCreate) return;
    if (!selectedPlace) {
      setExpectedRegisteredVoters(null);
      setExpectedBallotsIssued(null);
    }
  }, [visible, isCreate, selectedPlace]);

  const createM = useMutation({
    mutationFn: async (req: VoteSubmissionCreateRequest) =>
      createSubmissionMultipart({ payload: req, files }),
    onSuccess: async (created: any) => {
      if (flagChecked) {
        const reason = flagReason.trim();
        const newId = String(created?.submissionId ?? "");
        if (newId && reason) {
          await flagSubmission(newId, {
            actorUserId,
            flagged: true,
            comments: reason,
          });
        }
      }
      await props.onSaved();
    },
  });

  const updateM = useMutation({
    mutationFn: async (p: {
      id: string;
      req: VoteSubmissionUpdateRequest;
      files?: File[];
    }) => {
      if (p.files && p.files.length) {
        return updateSubmissionMultipart({
          id: p.id,
          payload: p.req,
          files: p.files,
        });
      }
      return updateSubmissionJson(p.id, p.req);
    },
    onSuccess: async () => {
      await props.onSaved();
    },
  });

  const flagM = useMutation({
    mutationFn: async (p: { id: string; flagged: boolean; comments?: string }) =>
      flagSubmission(p.id, {
        actorUserId,
        flagged: p.flagged,
        comments: p.comments,
      }),
    onSuccess: async () => {
      await editQ.refetch();
      await props.onSaved();
    },
  });

  const busy = createM.isPending || updateM.isPending || flagM.isPending;
  const orgIdForCreate = props.effectiveOrgId || "";

  const baseReady =
    props.canCreate &&
    !createM.isPending &&
    Boolean(orgIdForCreate) &&
    Boolean(props.electionId) &&
    Boolean(selectedCenter) &&
    Boolean(selectedPlace) &&
    Boolean(selectedContest);

  const flagReasonOk = !flagChecked || Boolean(flagReason.trim());
  const ballotsReceivedOk = ballotsReceived !== "";
  const reconcileOk = !exceedsIssued && !exceedsRegistered;
  const canActuallySubmit =
    baseReady && files.length > 0 && flagReasonOk && ballotsReceivedOk && reconcileOk;
  const canSaveDraft = baseReady && flagReasonOk && ballotsReceivedOk;

  const canSubmitEditDraft =
    props.canCreate &&
    Boolean(props.submissionId) &&
    isDraft &&
    files.length > 0 &&
    !updateM.isPending &&
    ballotsReceivedOk &&
    reconcileOk;

  if (!props.open) return null;

  const electionName =
    props.elections.find((e) => e.electionId === props.electionId)
      ?.electionName ?? "—";

  const contestName =
    props.contests.find((c) => c.contestId === selectedContest)?.contestName ??
    (editQ.data as any)?.contestName ??
    "—";

  const headerSubtitle = isCreate
    ? `${electionName} • ${contestName}`
    : `Contest: ${contestName}`;

  const buildCreateReq = (draft: boolean): VoteSubmissionCreateRequest => {
    return {
      orgId: orgIdForCreate,
      electionId: props.electionId,
      centerId: selectedCenter,
      placeId: selectedPlace,
      agentId: props.agentId,
      contestId: selectedContest,
      candidateVotes,
      ballotsReceived: ballotsReceived === "" ? undefined : Number(ballotsReceived),
      ballotsInBox: ballotsInBoxNumber,
      invalidBallots: invalidBallots === "" ? undefined : Number(invalidBallots),
      rejectedBallots:
        rejectedBallots === "" ? undefined : Number(rejectedBallots),
      spoiledBallots:
        spoiledBallots === "" ? undefined : Number(spoiledBallots),
      unmarkedBallots:
        unmarkedBallots === "" ? undefined : Number(unmarkedBallots),
      unusedBallots: unusedBallots === "" ? undefined : Number(unusedBallots),
      comments: comments || undefined,
      latitude: latitude === "" ? undefined : Number(latitude),
      longitude: longitude === "" ? undefined : Number(longitude),
      idempotencyKey: `${props.agentId}-${Date.now()}`,
      draft: draft ? true : undefined,
    } as any;
  };

  const buildUpdateReq = (): VoteSubmissionUpdateRequest => {
    return {
      candidateVotes,
      ballotsReceived: ballotsReceived === "" ? undefined : Number(ballotsReceived),
      ballotsInBox: ballotsInBoxNumber,
      invalidBallots: invalidBallots === "" ? undefined : Number(invalidBallots),
      rejectedBallots:
        rejectedBallots === "" ? undefined : Number(rejectedBallots),
      spoiledBallots:
        spoiledBallots === "" ? undefined : Number(spoiledBallots),
      unmarkedBallots:
        unmarkedBallots === "" ? undefined : Number(unmarkedBallots),
      unusedBallots: unusedBallots === "" ? undefined : Number(unusedBallots),
      comments: comments || undefined,
      latitude: latitude === "" ? undefined : Number(latitude),
      longitude: longitude === "" ? undefined : Number(longitude),
    } as any;
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-slate-900/40"
        onClick={() => {
          if (busy) return;
          props.onClose();
        }}
      />

      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="w-full sm:max-w-2xl md:max-w-5xl lg:max-w-6xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col h-[calc(100vh-8px)] sm:h-auto sm:max-h-[82vh] overflow-hidden">
          {/* header - Blue Gradient */}
          <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-2xl font-bold">
                  {isCreate ? "New Vote Submission" : "Edit Submission"}
                </div>
                <div className="text-sm text-blue-100 mt-0.5">
                  {headerSubtitle}
                </div>

                {isCreate &&
                  props.dashboardMode === "SYSTEM" &&
                  !props.effectiveOrgId ? (
                  <div className="mt-1 text-base font-bold text-yellow-200">
                    Select a tenant first
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={props.onClose}
                disabled={busy}
                className="shrink-0 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold h-9 w-9 grid place-items-center disabled:opacity-60 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Stats - Larger */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
                <div className="h-7 w-7 rounded-full bg-white text-blue-600 text-xs font-bold grid place-items-center">
                  {agentInitials}
                </div>
                <span className="text-sm font-bold">{agentName}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
                <span className="text-base font-bold text-white">Valid</span>
                <span className="text-xl font-bold">{validVotes}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
                <span className="text-base font-bold text-white">In Box</span>
                <span className="text-xl font-bold">{ballotsInBoxNumber}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
                <span className="text-base font-bold text-white">Invalid</span>
                <span className="text-xl font-bold">{invalidTotalNumber}</span>
              </div>
            </div>
          </div>

          {/* body - 60/30 split */}
          <div className="flex-1 overflow-y-auto px-3 py-3 pb-24 bg-slate-100">
            {isEdit && editQ.isLoading && (
              <div className="text-sm text-slate-600">Loading…</div>
            )}
            {isEdit && editQ.isError && (
              <div className="text-base font-bold text-red-700">
                {friendlyError(editQ.error)}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_0.8fr] gap-3">
              {/* LEFT - 60% */}
              <div className="space-y-3">
                {isCreate && (
                  <Section
                    title="📍 Location"
                    bgColor="bg-red-400/10"
                    borderColor="border-amber-200"
                  >
                    <div className="grid grid-cols-2 gap-2.5">
                      <Field label="County">
                        <select
                          value={mCounty}
                          onChange={(e) => setMCounty(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold"
                        >
                          <option value="">Select</option>
                          {counties.map((c) => (
                            <option key={c.countyId} value={c.countyId}>
                              {c.countyName}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="District">
                        <select
                          value={mDistrict}
                          onChange={(e) => setMDistrict(e.target.value)}
                          disabled={!mCounty}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
                        >
                          <option value="">Select</option>
                          {mDistricts.map((d) => (
                            <option key={d.districtId} value={d.districtId}>
                              {d.districtName}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Center">
                        <select
                          value={selectedCenter}
                          onChange={(e) => {
                            setSelectedCenter(e.target.value);
                            setSelectedPlace("");
                          }}
                          disabled={!mCounty && !mDistrict}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
                        >
                          <option value="">Select</option>
                          {mCenters.map((c) => (
                            <option key={c.centerId} value={c.centerId}>
                              {c.centerName}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Place">
                        <select
                          value={selectedPlace}
                          onChange={(e) => setSelectedPlace(e.target.value)}
                          disabled={!selectedCenter}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
                        >
                          <option value="">Select</option>
                          {mPlaces.map((p) => (
                            <option key={(p as any).placeId} value={(p as any).placeId}>
                              {placeLabel(p) || "—"}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </Section>
                )}

                <Section
                  title="👥 Votes Sheet"
                  bgColor="bg-blue-600/10"
                  borderColor="border-purple-200"
                  right={
                    selectedContest ? (
                      <button
                        type="button"
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-bold hover:bg-slate-50"
                        onClick={() => setCandidateVotes({})}
                      >
                        Clear
                      </button>
                    ) : null
                  }
                >
                  <div>
                    <Field label="Contest">
                      <select
                        value={selectedContest}
                        onChange={(e) => setSelectedContest(e.target.value)}
                        disabled={isEdit && Boolean((editQ.data as any)?.contestId)}
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
                      >
                        <option value="">Select</option>
                        {props.contests.map((ct: ContestDto) => (
                          <option key={ct.contestId} value={ct.contestId}>
                            {ct.contestName}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {!selectedContest ? (
                      <div className="mt-2 text-sm text-slate-600">Select contest</div>
                    ) : contestOptionsQ.isLoading ? (
                      <div className="mt-2 text-sm text-slate-600">Loading…</div>
                    ) : contestOptionsQ.isError ? (
                      <div className="mt-2 text-sm font-bold text-red-700">
                        {friendlyError(contestOptionsQ.error)}
                      </div>
                    ) : !candidateOptions.length ? (
                      <div className="mt-2 text-sm text-slate-600">No candidates</div>
                    ) : (
                      <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden max-h-[350px] overflow-y-auto bg-white">
                        <table className="w-full text-base">
                          <thead className="bg-purple-100 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left font-bold text-slate-600">
                                Candidate
                              </th>
                              <th className="px-3 py-2 text-left font-bold text-slate-600 w-24">
                                Party
                              </th>
                              <th className="px-3 py-2 text-right font-bold text-slate-600 w-20">
                                Votes
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {candidateOptions.map((o: any, idx: number) => {
                              const voteKey = String(o.electId ?? o.optionId ?? o.id ?? o.key);
                              const votes = candidateVotes[voteKey] ?? 0;
                              const name = o.electionCandidate || o.candidateName || o.label || voteKey;
                              const party = o.abbreviation || o.partyAbbreviation || "";

                              return (
                                <tr
                                  key={voteKey}
                                  className={`border-t border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-purple-50/30"
                                    }`}
                                >
                                  <td className="px-3 py-2 font-semibold text-slate-900">
                                    {name}
                                  </td>
                                  <td className="px-3 py-2">
                                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-base font-bold text-slate-700">
                                      {party || "—"}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <input
                                      type="number"
                                      min={0}
                                      inputMode="numeric"
                                      value={String(votes)}
                                      onChange={(e) => {
                                        const n = clampNum(e.target.value);
                                        setCandidateVotes((s) => ({ ...s, [voteKey]: n }));
                                      }}
                                      className="h-7 w-18 rounded-md border border-slate-200 bg-white px-2 text-right text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </Section>
              </div>

              {/* CENTER - 30% */}
              <div className="space-y-3">
                <Section
                  title="📦 Ballots"
                  bgColor="bg-red-100/50"
                  borderColor="border-green-200"
                >
                  <div className="space-y-2">
                    <Stat label="In Box" value={String(ballotsInBoxNumber)} />
                    <Stat label="Invalid" value={String(invalidTotalNumber)} />
                    <Stat label="Outside" value={String(outsideBoxNumber)} />
                    <Stat
                      label="Issued"
                      value={
                        placeAllocQ.isFetching
                          ? "…"
                          : expectedBallotsIssued == null
                            ? "—"
                            : String(expectedBallotsIssued)
                      }
                    />
                    <Stat
                      label="Voters"
                      value={
                        placeAllocQ.isFetching
                          ? "…"
                          : expectedRegisteredVoters == null
                            ? "—"
                            : String(expectedRegisteredVoters)
                      }
                    />

                    {(exceedsIssued || exceedsRegistered) && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm font-bold text-red-700">
                        ⚠️ Exceeds limit
                      </div>
                    )}

                    {ballotsReceived === "" && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm font-bold text-red-700">
                        ⚠️ Ballots Received is required
                      </div>
                    )}

                    <div className="space-y-1.5 pt-2 border-t border-green-600">
                      <SmallNumberField
                        label="Received"
                        value={ballotsReceived}
                        onChange={setBallotsReceived}
                        required={true}
                      />
                      <SmallNumberField
                        label="Invalid"
                        value={invalidBallots}
                        onChange={setInvalidBallots}
                      />
                      <SmallNumberField
                        label="Rejected"
                        value={rejectedBallots}
                        onChange={setRejectedBallots}
                      />
                      <SmallNumberField
                        label="Unmarked"
                        value={unmarkedBallots}
                        onChange={setUnmarkedBallots}
                      />
                      <SmallNumberField
                        label="Spoiled"
                        value={spoiledBallots}
                        onChange={setSpoiledBallots}
                      />
                      <SmallNumberField
                        label="Unused"
                        value={unusedBallots}
                        onChange={setUnusedBallots}
                      />
                    </div>
                  </div>
                </Section>
              </div>

              {/* RIGHT - 20% (sidebar) */}
              <div className="space-y-3">
                <Section
                  title="📷 Evidence"
                  bgColor="bg-slate-200"
                  borderColor="border-cyan-200"
                >
                  <div
                    className={`rounded-lg border p-2.5 transition ${isDragging
                      ? "border-blue-300 bg-blue-500"
                      : "border-slate-200 bg-slate-50"
                      }`}
                  >
                    <div
                      className="text-center cursor-pointer"
                      onClick={openFileDialog}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      <UploadCloud className="h-5 w-5 mx-auto mb-1 text-slate-600" />
                      <div className="text-base font-bold text-slate-600">Drop here</div>
                      <div className="text-xs text-slate-500">{files.length} file(s)</div>
                    </div>

                    {previews.length > 0 && (
                      <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto">
                        {previews.map((p, i) => (
                          <div
                            key={`${p.name}-${i}`}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex items-center gap-2"
                          >
                            <div className="h-6 w-6 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center flex-shrink-0">
                              {p.type.includes("pdf") ? (
                                <FileText className="h-3 w-3" />
                              ) : (
                                <ImageIcon className="h-3 w-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-bold truncate">{p.name}</div>
                            </div>
                            <button
                              type="button"
                              className="p-0.5 hover:bg-slate-100 rounded"
                              onClick={() => removeFile(i)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Section>

                <Section
                  title="📝 Notes"
                  bgColor="bg-orange-50"
                  borderColor="border-orange-200"
                >
                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold"
                    placeholder="Notes"
                  />

                  <label className="mt-2 flex items-center gap-2 text-base font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={flagChecked}
                      onChange={(e) => setFlagChecked(e.target.checked)}
                      className="h-4 w-4"
                    />
                    <span>Flag</span>
                  </label>

                  {flagChecked && (
                    <textarea
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      rows={2}
                      className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold"
                      placeholder="Reason"
                    />
                  )}

                  <button
                    type="button"
                    className="mt-2 w-full text-left px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm flex items-center justify-between"
                    onClick={() => setAdvancedOpen((s) => !s)}
                  >
                    <span>🗺️ GPS</span>
                    {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
                  </button>

                  {advancedOpen && (
                    <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-200">
                      <SmallField label="Lat">
                        <input
                          type="number"
                          step="any"
                          value={String(latitude)}
                          onChange={(e) =>
                            setLatitude(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-base font-semibold"
                        />
                      </SmallField>
                      <SmallField label="Lon">
                        <input
                          type="number"
                          step="any"
                          value={String(longitude)}
                          onChange={(e) =>
                            setLongitude(e.target.value === "" ? "" : Number(e.target.value))
                          }
                          className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold"
                        />
                      </SmallField>
                      <button
                        type="button"
                        className="w-full h-8 rounded-lg border border-slate-200 bg-white text-sm font-bold hover:bg-slate-50"
                        onClick={() => {
                          if (!("geolocation" in navigator)) {
                            setGeoStatus("N/A");
                            return;
                          }
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setLatitude(Number(pos.coords.latitude));
                              setLongitude(Number(pos.coords.longitude));
                              setGeoStatus("✓");
                            },
                            () => setGeoStatus("✕"),
                            { enableHighAccuracy: true, timeout: 8000, maximumAge: 10_000 }
                          );
                        }}
                      >
                        Use GPS
                      </button>
                    </div>
                  )}
                </Section>
              </div>
            </div>

            {isCreate && createM.isError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-base font-bold text-red-700">
                {friendlyError(createM.error)}
              </div>
            )}
            {isEdit && (updateM.isError || flagM.isError) && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-base font-bold text-red-700">
                {friendlyError(updateM.error || flagM.error)}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="sticky bottom-0 border-t bg-white px-3 py-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={props.onClose}
              disabled={busy}
              className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-base font-bold hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            {isEdit && (
              <button
                type="button"
                disabled={
                  busy || !props.submissionId || editQ.isLoading || (flagChecked && !flagReason.trim())
                }
                onClick={() => {
                  if (!props.submissionId) return;
                  if (flagChecked) {
                    if (!flagReason.trim()) {
                      alert("Reason required");
                      return;
                    }
                    flagM.mutate({ id: props.submissionId, flagged: true, comments: flagReason });
                    return;
                  }
                  if (!confirm("Unflag?")) return;
                  flagM.mutate({ id: props.submissionId, flagged: false });
                }}
                className={`h-9 rounded-lg px-4 text-base font-bold text-white ${busy ? "bg-slate-400" : isFlagged ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-black"
                  }`}
              >
                {flagChecked ? "Flag" : "Unflag"}
              </button>
            )}

            {isCreate && (
              <>
                <button
                  type="button"
                  disabled={!canSaveDraft}
                  onClick={() => {
                    if (!orgIdForCreate) {
                      alert("Select tenant");
                      return;
                    }
                    const req = buildCreateReq(true);
                    createM.mutate(req, { onSuccess: () => props.onClose() });
                  }}
                  className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-base font-bold hover:bg-slate-50 disabled:opacity-60"
                >
                  Draft
                </button>

                <button
                  type="button"
                  disabled={!canActuallySubmit}
                  onClick={() => {
                    if (!orgIdForCreate || exceedsIssued || exceedsRegistered) return;
                    const req = buildCreateReq(false);
                    createM.mutate(req, { onSuccess: () => props.onClose() });
                  }}
                  className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white px-4 text-base font-bold disabled:bg-slate-400"
                >
                  Submit
                </button>
              </>
            )}

            {isEdit && (
              <>
                {isDraft && (
                  <button
                    type="button"
                    disabled={!canSubmitEditDraft}
                    onClick={() => {
                      if (!props.submissionId) return;
                      const req = buildUpdateReq();
                      updateM.mutate(
                        {
                          id: props.submissionId,
                          req,
                          files: files.length ? files : undefined,
                        },
                        { onSuccess: () => props.onClose() }
                      );
                    }}
                    className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white px-4 text-base font-bold disabled:bg-slate-400"
                  >
                    Submit
                  </button>
                )}
                <button
                  type="button"
                  disabled={updateM.isPending || !props.submissionId}
                  onClick={() => {
                    if (!props.submissionId) return;
                    const req = buildUpdateReq();
                    updateM.mutate(
                      {
                        id: props.submissionId,
                        req,
                        files: files.length ? files : undefined,
                      },
                      { onSuccess: () => props.onClose() }
                    );
                  }}
                  className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white px-4 text-base font-bold disabled:bg-slate-400"
                >
                  Save
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** components */
function Section(props: {
  title?: string;
  bgColor?: string;
  borderColor?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const bg = props.bgColor || "bg-white";
  const border = props.borderColor || "border-slate-200";

  return (
    <div className={`rounded-xl border ${border} ${bg} px-3 py-3`}>
      {props.title && (
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="text-xl font-bold text-slate-900">{props.title}</div>
          {props.right}
        </div>
      )}
      {props.children}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-bold text-slate-600 mb-1">{props.label}</div>
      {props.children}
    </div>
  );
}

function SmallField(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-bold text-slate-600 mb-0.5">{props.label}</div>
      {props.children}
    </div>
  );
}

function Stat(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
      <span className="text-base font-bold text-slate-600">{props.label}</span>
      <span className="text-xl font-extrabold text-slate-900">{props.value}</span>
    </div>
  );
}

function SmallNumberField(props: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
  required?: boolean;
}) {
  const isEmpty = props.value === "";
  const isRequired = props.required === true;

  return (
    <div className="flex items-center gap-2">
      <label
        className={`text-base font-bold w-19 ${isRequired && isEmpty ? "text-red-700" : "text-slate-600"
          }`}
      >
        {props.label}
        {isRequired && <span className="text-red-600 ml-1">*</span>}
      </label>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={String(props.value)}
        onChange={(e) =>
          props.onChange(e.target.value === "" ? "" : clampNum(e.target.value))
        }
        className={`h-8 w-20 rounded-lg border px-2 text-right text-xl font-bold focus:outline-none focus:ring-1 ${isRequired && isEmpty
          ? "border-red-400 bg-red-50 focus:ring-red-400"
          : "border-slate-200 bg-white focus:ring-slate-200"
          }`}
      />
    </div>
  );
}


// // //// SubmissionFormModal.tsx

// import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useMutation, useQuery } from "@tanstack/react-query";
// import {
//   UploadCloud,
//   X,
//   Image as ImageIcon,
//   FileText,
//   ChevronDown,
//   ChevronUp,
// } from "lucide-react";

// import type { ElectionDto } from "../../../../../shared/services/electionService";
// import type { ContestDto } from "../../../../../auth/contestTypes";

// import {
//   fetchCounties,
//   type CountyDto,
// } from "../../../../../shared/services/countyService";

// import {
//   fetchDistrictsByCounty,
//   type DistrictDto,
// } from "../../../../../shared/services/districtService";

// import {
//   fetchPollingCenters,
//   type PollingCenterDto,
// } from "../../../../../shared/services/pollingCenterService";

// import {
//   fetchPollingPlaces,
//   type PollingPlaceDto,
// } from "../../../../../shared/services/pollingPlaceService";

// import {
//   listOptionsByContest,
//   type ContestOptionDto,
// } from "../../../../../shared/services/contestOptionService";

// import {
//   createSubmissionMultipart,
//   getSubmission,
//   updateSubmissionJson,
//   updateSubmissionMultipart,
//   flagSubmission,
//   type VoteSubmissionDto,
//   type VoteSubmissionCreateRequest,
//   type VoteSubmissionUpdateRequest,
// } from "../../../../../shared/services/voteSubmissionService";

// import { fetchMe } from "../../../../../shared/services/userService";
// import type { UserDto } from "../../../../../auth/userTypes";

// import {
//   searchPlaceAllocations,
//   type PollingPlaceAllocationDto,
// } from "../../../../../shared/services/pollingPlaceAllocationService";

// /** helpers */
// function safeStr(v: any) {
//   return typeof v === "string" ? v : v == null ? "" : String(v);
// }
// function friendlyError(err: any) {
//   return (
//     safeStr(err?.response?.data?.message) ||
//     safeStr(err?.response?.data?.error) ||
//     safeStr(err?.message) ||
//     "Request failed."
//   );
// }
// function sumVotes(map: Record<string, number>) {
//   return Object.values(map ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);
// }
// function userFullName(u: any) {
//   const fn = String(u?.firstName ?? "").trim();
//   const ln = String(u?.lastName ?? "").trim();
//   const nm = `${fn} ${ln}`.trim();
//   return nm || String(u?.userName ?? "—");
// }
// function initials(u: any) {
//   const a = String(u?.firstName ?? "").trim().slice(0, 1);
//   const b = String(u?.lastName ?? "").trim().slice(0, 1);
//   const s = `${a}${b}`.toUpperCase();
//   return s || "U";
// }
// function placeLabel(p: any): string {
//   return (
//     String(p?.label ?? "") ||
//     String(p?.placeLabel ?? "") ||
//     (p?.placeNumber != null ? `Place ${p.placeNumber}` : "") ||
//     String(p?.code ?? "") ||
//     "—"
//   );
// }
// function clampNum(n: any) {
//   const v = Number(n);
//   if (!isFinite(v) || v < 0) return 0;
//   return Math.floor(v);
// }

// export type SubmissionFormMode = "create" | "edit";

// export default function SubmissionFormModal(props: {
//   mode: SubmissionFormMode;
//   open: boolean;
//   onClose: () => void;
//   effectiveOrgId?: string;
//   dashboardMode?: string;
//   user: any;
//   agentId: string;
//   canCreate: boolean;
//   electionId: string;
//   elections: ElectionDto[];
//   contests: ContestDto[];
//   submissionId?: string;
//   onSaved: () => void | Promise<void>;
// }) {
//   const isCreate = props.mode === "create";
//   const isEdit = props.mode === "edit";
//   const visible = Boolean(props.open);

//   const meQ = useQuery<UserDto>({
//     enabled: visible && Boolean(props.effectiveOrgId),
//     queryKey: ["users", "me", props.effectiveOrgId],
//     queryFn: () => fetchMe(props.effectiveOrgId as string),
//     staleTime: 60_000,
//     retry: 1,
//   });

//   const agentUser = meQ.data ?? props.user;
//   const agentName = userFullName(agentUser);
//   const agentInitials = initials(agentUser);
//   const actorUserId = (agentUser as any)?.userId ?? props.agentId;

//   const countiesQ = useQuery<CountyDto[]>({
//     enabled: visible && isCreate,
//     queryKey: ["counties", "modal-all"],
//     queryFn: async () =>
//       (await fetchCounties({ page: 0, size: 500 })).items as CountyDto[],
//     staleTime: 60_000,
//     retry: 1,
//   });
//   const counties = countiesQ.data ?? [];

//   const [mCounty, setMCounty] = useState<string>("");
//   const mDistrictsQ = useQuery<DistrictDto[]>({
//     enabled: visible && isCreate && Boolean(mCounty),
//     queryKey: ["districts", "modal", mCounty],
//     queryFn: async () =>
//       (await fetchDistrictsByCounty(mCounty)) as DistrictDto[],
//     staleTime: 60_000,
//     retry: 1,
//   });
//   const mDistricts = mDistrictsQ.data ?? [];
//   const [mDistrict, setMDistrict] = useState<string>("");

//   const mCentersQ = useQuery<PollingCenterDto[]>({
//     enabled: visible && isCreate && (Boolean(mCounty) || Boolean(mDistrict)),
//     queryKey: ["polling-centers", "modal", mCounty, mDistrict],
//     queryFn: async () => {
//       const p = await fetchPollingCenters({
//         page: 0,
//         size: 500,
//         countyId: mCounty || undefined,
//         districtId: mDistrict || undefined,
//       });
//       return p.items as PollingCenterDto[];
//     },
//     staleTime: 60_000,
//     retry: 1,
//   });
//   const mCenters = mCentersQ.data ?? [];

//   const [selectedCenter, setSelectedCenter] = useState<string>("");
//   const mPlacesQ = useQuery<PollingPlaceDto[]>({
//     enabled: visible && isCreate && Boolean(selectedCenter),
//     queryKey: ["polling-places", "modal", selectedCenter],
//     queryFn: async () =>
//       (
//         await fetchPollingPlaces({
//           page: 0,
//           size: 2000,
//           centerId: selectedCenter,
//         })
//       ).items as PollingPlaceDto[],
//     staleTime: 60_000,
//     retry: 1,
//   });
//   const mPlaces = mPlacesQ.data ?? [];
//   const [selectedPlace, setSelectedPlace] = useState<string>("");

//   const [selectedContest, setSelectedContest] = useState<string>("");
//   const contestOptionsQ = useQuery<ContestOptionDto[]>({
//     enabled: visible && Boolean(selectedContest),
//     queryKey: ["contest-options", "modal", selectedContest],
//     queryFn: () =>
//       listOptionsByContest({
//         contestId: selectedContest,
//         onlyActive: true,
//       }) as any,
//     staleTime: 60_000,
//     retry: 1,
//   });

//   const candidateOptions = useMemo(() => {
//     const opts = contestOptionsQ.data ?? [];
//     return (opts as any[])
//       .filter((o) => String(o?.optionType ?? "").toUpperCase() === "CANDIDATE")
//       .sort((a, b) => (a.optionOrder ?? 0) - (b.optionOrder ?? 0));
//   }, [contestOptionsQ.data]);

//   const [candidateVotes, setCandidateVotes] = useState<Record<string, number>>(
//     {}
//   );
//   const [ballotsReceived, setBallotsReceived] = useState<number | "">("");
//   const [invalidBallots, setInvalidBallots] = useState<number | "">("");
//   const [rejectedBallots, setRejectedBallots] = useState<number | "">("");
//   const [spoiledBallots, setSpoiledBallots] = useState<number | "">("");
//   const [unmarkedBallots, setUnmarkedBallots] = useState<number | "">("");
//   const [unusedBallots, setUnusedBallots] = useState<number | "">("");

//   const [expectedRegisteredVoters, setExpectedRegisteredVoters] = useState<
//     number | null
//   >(null);
//   const [expectedBallotsIssued, setExpectedBallotsIssued] = useState<
//     number | null
//   >(null);

//   const [flagChecked, setFlagChecked] = useState(false);
//   const [flagReason, setFlagReason] = useState("");

//   const [comments, setComments] = useState<string>("");
//   const [latitude, setLatitude] = useState<number | "">("");
//   const [longitude, setLongitude] = useState<number | "">("");
//   const [geoStatus, setGeoStatus] = useState<string>("");
//   const [advancedOpen, setAdvancedOpen] = useState(false);

//   const [files, setFiles] = useState<File[]>([]);
//   const [previews, setPreviews] = useState<
//     Array<{ name: string; url?: string; type: string }>
//   >([]);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);
//   const [isDragging, setIsDragging] = useState(false);

//   useEffect(() => {
//     const created: Array<{ name: string; url?: string; type: string }> = [];
//     for (const f of files) {
//       if (f.type.startsWith("image/")) {
//         const u = URL.createObjectURL(f);
//         created.push({ name: f.name, url: u, type: f.type });
//       } else {
//         created.push({
//           name: f.name,
//           type: f.type || "application/octet-stream",
//         });
//       }
//     }
//     setPreviews(created);
//     return () => {
//       for (const p of created) if (p.url) URL.revokeObjectURL(p.url);
//     };
//   }, [files]);

//   function addFiles(newFiles: File[]) {
//     setFiles((cur) => {
//       const seen = new Set(cur.map((f) => `${f.name}:${f.size}`.toLowerCase()));
//       const out = [...cur];
//       for (const f of newFiles) {
//         const k = `${f.name}:${f.size}`.toLowerCase();
//         if (!seen.has(k)) {
//           seen.add(k);
//           out.push(f);
//         }
//       }
//       return out;
//     });
//   }

//   function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
//     addFiles(Array.from(e.target.files ?? []));
//     if (fileInputRef.current) fileInputRef.current.value = "";
//   }

//   function onDrop(e: React.DragEvent<HTMLDivElement>) {
//     e.preventDefault();
//     setIsDragging(false);
//     addFiles(Array.from(e.dataTransfer.files ?? []));
//   }

//   function onDragOver(e: React.DragEvent<HTMLDivElement>) {
//     e.preventDefault();
//     setIsDragging(true);
//   }

//   function onDragLeave() {
//     setIsDragging(false);
//   }

//   function removeFile(index: number) {
//     setFiles((cur) => cur.filter((_, i) => i !== index));
//   }

//   function openFileDialog() {
//     fileInputRef.current?.click();
//   }

//   const validVotes = useMemo(() => sumVotes(candidateVotes), [candidateVotes]);

//   const ballotsInBoxNumber = useMemo(() => {
//     return (
//       validVotes +
//       (Number(invalidBallots) || 0) +
//       (Number(rejectedBallots) || 0) +
//       (Number(unmarkedBallots) || 0)
//     );
//   }, [validVotes, invalidBallots, rejectedBallots, unmarkedBallots]);

//   const invalidTotalNumber = useMemo(() => {
//     return (
//       (Number(invalidBallots) || 0) +
//       (Number(rejectedBallots) || 0) +
//       (Number(unmarkedBallots) || 0)
//     );
//   }, [invalidBallots, rejectedBallots, unmarkedBallots]);

//   const outsideBoxNumber = useMemo(() => {
//     return (Number(unusedBallots) || 0) + (Number(spoiledBallots) || 0);
//   }, [unusedBallots, spoiledBallots]);

//   const exceedsIssued =
//     expectedBallotsIssued != null && ballotsInBoxNumber > expectedBallotsIssued;

//   const exceedsRegistered =
//     expectedRegisteredVoters != null &&
//     ballotsInBoxNumber > expectedRegisteredVoters;

//   useEffect(() => {
//     if (!visible || !isCreate) return;
//     setGeoStatus("");
//     setLatitude("");
//     setLongitude("");
//     if (!("geolocation" in navigator)) {
//       setGeoStatus("Geolocation not supported.");
//       return;
//     }
//     navigator.geolocation.getCurrentPosition(
//       (pos) => {
//         setLatitude(Number(pos.coords.latitude));
//         setLongitude(Number(pos.coords.longitude));
//         setGeoStatus("Location captured.");
//       },
//       (err) => setGeoStatus(err?.message || "Location unavailable."),
//       { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 }
//     );
//   }, [visible, isCreate]);

//   useEffect(() => {
//     if (!visible) return;
//     setAdvancedOpen(false);
//     setFiles([]);
//     setPreviews([]);
//     if (isCreate) {
//       setMCounty("");
//       setMDistrict("");
//       setSelectedCenter("");
//       setSelectedPlace("");
//       setSelectedContest("");
//       setCandidateVotes({});
//       setBallotsReceived("");
//       setInvalidBallots("");
//       setRejectedBallots("");
//       setSpoiledBallots("");
//       setUnmarkedBallots("");
//       setUnusedBallots("");
//       setComments("");
//       setExpectedRegisteredVoters(null);
//       setExpectedBallotsIssued(null);
//       setFlagChecked(false);
//       setFlagReason("");
//     }
//   }, [visible, isCreate]);

//   useEffect(() => {
//     if (!visible || !isCreate) return;
//     setMDistrict("");
//     setSelectedCenter("");
//     setSelectedPlace("");
//     setExpectedRegisteredVoters(null);
//     setExpectedBallotsIssued(null);
//   }, [mCounty, visible, isCreate]);

//   useEffect(() => {
//     if (!visible || !isCreate) return;
//     setSelectedCenter("");
//     setSelectedPlace("");
//     setExpectedRegisteredVoters(null);
//     setExpectedBallotsIssued(null);
//   }, [mDistrict, visible, isCreate]);

//   useEffect(() => {
//     if (!visible) return;
//     if (!isCreate) return;
//     setCandidateVotes({});
//   }, [selectedContest, visible, isCreate]);

//   const editQ = useQuery<VoteSubmissionDto>({
//     enabled: visible && isEdit && Boolean(props.submissionId),
//     queryKey: ["vote-submission", "detail", props.submissionId],
//     queryFn: () => getSubmission(props.submissionId as string),
//     staleTime: 0,
//     retry: 1,
//   });

//   const editStatus = String((editQ.data as any)?.status ?? "").toUpperCase();
//   const isFlagged = editStatus === "FLAGGED";
//   const isDraft = editStatus === "DRAFT";

//   useEffect(() => {
//     if (!visible || !isEdit) return;
//     const s: any = editQ.data;
//     if (!s) return;

//     setSelectedContest(String(s.contestId ?? ""));
//     setCandidateVotes(s.candidateVotes ?? {});
//     setBallotsReceived(s.ballotsReceived ?? "");
//     setInvalidBallots(s.invalidBallots ?? "");
//     setRejectedBallots(s.rejectedBallots ?? "");
//     setSpoiledBallots(s.spoiledBallots ?? "");
//     setUnmarkedBallots(s.unmarkedBallots ?? "");
//     setUnusedBallots(s.unusedBallots ?? "");
//     setComments(s.comments ?? "");
//     setLatitude(s.latitude ?? "");
//     setLongitude(s.longitude ?? "");
//     setFiles([]);
//     setPreviews([]);

//     setExpectedRegisteredVoters(
//       typeof s.registeredVoters === "number" ? s.registeredVoters : null
//     );
//     setExpectedBallotsIssued(
//       typeof s.ballotsIssued === "number" ? s.ballotsIssued : null
//     );

//     const st = String(s.status ?? "").toUpperCase();
//     const flaggedNow = st === "FLAGGED";
//     setFlagChecked(flaggedNow);

//     const c = String(s.comments ?? "");
//     if (flaggedNow && c.toLowerCase().startsWith("[flagged]")) {
//       setFlagReason(c.replace(/^\[flagged\]\s*/i, "").trim());
//     } else {
//       setFlagReason("");
//     }
//   }, [visible, isEdit, editQ.data]);

//   const placeAllocQ = useQuery<PollingPlaceAllocationDto | null>({
//     enabled:
//       visible &&
//       isCreate &&
//       Boolean(props.electionId) &&
//       Boolean(selectedPlace),
//     queryKey: ["place-allocation", "by-place", props.electionId, selectedPlace],
//     queryFn: async () => {
//       const page = await searchPlaceAllocations({
//         electionId: props.electionId,
//         placeId: selectedPlace,
//         page: 0,
//         size: 1,
//       });
//       return page.items?.[0] ?? null;
//     },
//     staleTime: 30_000,
//     retry: 1,
//   });

//   useEffect(() => {
//     if (!visible || !isCreate) return;
//     if (!selectedPlace) return;

//     const alloc = placeAllocQ.data;
//     if (alloc) {
//       setExpectedRegisteredVoters(
//         typeof alloc.registeredVoters === "number"
//           ? alloc.registeredVoters
//           : null
//       );
//       setExpectedBallotsIssued(
//         alloc.ballotsIssued == null ? null : Number(alloc.ballotsIssued)
//       );
//     } else {
//       setExpectedRegisteredVoters(null);
//       setExpectedBallotsIssued(null);
//     }
//   }, [visible, isCreate, selectedPlace, placeAllocQ.data]);

//   useEffect(() => {
//     if (!visible || !isCreate) return;
//     if (!selectedPlace) {
//       setExpectedRegisteredVoters(null);
//       setExpectedBallotsIssued(null);
//     }
//   }, [visible, isCreate, selectedPlace]);

//   const createM = useMutation({
//     mutationFn: async (req: VoteSubmissionCreateRequest) =>
//       createSubmissionMultipart({ payload: req, files }),
//     onSuccess: async (created: any) => {
//       if (flagChecked) {
//         const reason = flagReason.trim();
//         const newId = String(created?.submissionId ?? "");
//         if (newId && reason) {
//           await flagSubmission(newId, {
//             actorUserId,
//             flagged: true,
//             comments: reason,
//           });
//         }
//       }
//       await props.onSaved();
//     },
//   });

//   const updateM = useMutation({
//     mutationFn: async (p: {
//       id: string;
//       req: VoteSubmissionUpdateRequest;
//       files?: File[];
//     }) => {
//       if (p.files && p.files.length) {
//         return updateSubmissionMultipart({
//           id: p.id,
//           payload: p.req,
//           files: p.files,
//         });
//       }
//       return updateSubmissionJson(p.id, p.req);
//     },
//     onSuccess: async () => {
//       await props.onSaved();
//     },
//   });

//   const flagM = useMutation({
//     mutationFn: async (p: { id: string; flagged: boolean; comments?: string }) =>
//       flagSubmission(p.id, {
//         actorUserId,
//         flagged: p.flagged,
//         comments: p.comments,
//       }),
//     onSuccess: async () => {
//       await editQ.refetch();
//       await props.onSaved();
//     },
//   });

//   const busy = createM.isPending || updateM.isPending || flagM.isPending;
//   const orgIdForCreate = props.effectiveOrgId || "";

//   const baseReady =
//     props.canCreate &&
//     !createM.isPending &&
//     Boolean(orgIdForCreate) &&
//     Boolean(props.electionId) &&
//     Boolean(selectedCenter) &&
//     Boolean(selectedPlace) &&
//     Boolean(selectedContest);

//   const flagReasonOk = !flagChecked || Boolean(flagReason.trim());
//   const reconcileOk = !exceedsIssued && !exceedsRegistered;
//   const canActuallySubmit =
//     baseReady && files.length > 0 && flagReasonOk && reconcileOk;
//   const canSaveDraft = baseReady && flagReasonOk;

//   const canSubmitEditDraft =
//     props.canCreate &&
//     Boolean(props.submissionId) &&
//     isDraft &&
//     files.length > 0 &&
//     !updateM.isPending &&
//     reconcileOk;

//   if (!props.open) return null;

//   const electionName =
//     props.elections.find((e) => e.electionId === props.electionId)
//       ?.electionName ?? "—";

//   const contestName =
//     props.contests.find((c) => c.contestId === selectedContest)?.contestName ??
//     (editQ.data as any)?.contestName ??
//     "—";

//   const headerSubtitle = isCreate
//     ? `${electionName} • ${contestName}`
//     : `Contest: ${contestName}`;

//   const buildCreateReq = (draft: boolean): VoteSubmissionCreateRequest => {
//     return {
//       orgId: orgIdForCreate,
//       electionId: props.electionId,
//       centerId: selectedCenter,
//       placeId: selectedPlace,
//       agentId: props.agentId,
//       contestId: selectedContest,
//       candidateVotes,
//       ballotsReceived: ballotsReceived === "" ? undefined : Number(ballotsReceived),
//       ballotsInBox: ballotsInBoxNumber,
//       invalidBallots: invalidBallots === "" ? undefined : Number(invalidBallots),
//       rejectedBallots:
//         rejectedBallots === "" ? undefined : Number(rejectedBallots),
//       spoiledBallots:
//         spoiledBallots === "" ? undefined : Number(spoiledBallots),
//       unmarkedBallots:
//         unmarkedBallots === "" ? undefined : Number(unmarkedBallots),
//       unusedBallots: unusedBallots === "" ? undefined : Number(unusedBallots),
//       comments: comments || undefined,
//       latitude: latitude === "" ? undefined : Number(latitude),
//       longitude: longitude === "" ? undefined : Number(longitude),
//       idempotencyKey: `${props.agentId}-${Date.now()}`,
//       draft: draft ? true : undefined,
//     } as any;
//   };

//   const buildUpdateReq = (): VoteSubmissionUpdateRequest => {
//     return {
//       candidateVotes,
//       ballotsReceived: ballotsReceived === "" ? undefined : Number(ballotsReceived),
//       ballotsInBox: ballotsInBoxNumber,
//       invalidBallots: invalidBallots === "" ? undefined : Number(invalidBallots),
//       rejectedBallots:
//         rejectedBallots === "" ? undefined : Number(rejectedBallots),
//       spoiledBallots:
//         spoiledBallots === "" ? undefined : Number(spoiledBallots),
//       unmarkedBallots:
//         unmarkedBallots === "" ? undefined : Number(unmarkedBallots),
//       unusedBallots: unusedBallots === "" ? undefined : Number(unusedBallots),
//       comments: comments || undefined,
//       latitude: latitude === "" ? undefined : Number(latitude),
//       longitude: longitude === "" ? undefined : Number(longitude),
//     } as any;
//   };

//   return (
//     <div className="fixed inset-0 z-50">
//       <div
//         className="absolute inset-0 bg-slate-900/40"
//         onClick={() => {
//           if (busy) return;
//           props.onClose();
//         }}
//       />

//       <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
//         <div className="w-full sm:max-w-2xl md:max-w-5xl lg:max-w-6xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col h-[calc(100vh-8px)] sm:h-auto sm:max-h-[82vh] overflow-hidden">
//           {/* header - Blue Gradient */}
//           <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-4">
//             <div className="flex items-start justify-between gap-3">
//               <div className="min-w-0">
//                 <div className="text-2xl font-bold">
//                   {isCreate ? "New Vote Submission" : "Edit Submission"}
//                 </div>
//                 <div className="text-sm text-blue-100 mt-0.5">
//                   {headerSubtitle}
//                 </div>

//                 {isCreate &&
//                   props.dashboardMode === "SYSTEM" &&
//                   !props.effectiveOrgId ? (
//                   <div className="mt-1 text-base font-bold text-yellow-200">
//                     Select a tenant first
//                   </div>
//                 ) : null}
//               </div>

//               <button
//                 type="button"
//                 onClick={props.onClose}
//                 disabled={busy}
//                 className="shrink-0 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold h-9 w-9 grid place-items-center disabled:opacity-60 transition"
//               >
//                 <X className="h-5 w-5" />
//               </button>
//             </div>

//             {/* Quick Stats - Larger */}
//             <div className="mt-3 flex flex-wrap items-center gap-2">
//               <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
//                 <div className="h-7 w-7 rounded-full bg-white text-blue-600 text-xs font-bold grid place-items-center">
//                   {agentInitials}
//                 </div>
//                 <span className="text-sm font-bold">{agentName}</span>
//               </div>

//               <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
//                 <span className="text-base font-bold text-white">Valid</span>
//                 <span className="text-xl font-bold">{validVotes}</span>
//               </div>

//               <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
//                 <span className="text-base font-bold text-white">In Box</span>
//                 <span className="text-xl font-bold">{ballotsInBoxNumber}</span>
//               </div>

//               <div className="inline-flex items-center gap-2 rounded-full bg-red/20 backdrop-blur-sm border border-white/30 px-2.5 py-1.5">
//                 <span className="text-base font-bold text-white">Invalid</span>
//                 <span className="text-xl font-bold">{invalidTotalNumber}</span>
//               </div>
//             </div>
//           </div>

//           {/* body - 60/30 split */}
//           <div className="flex-1 overflow-y-auto px-3 py-3 pb-24 bg-slate-100">
//             {isEdit && editQ.isLoading && (
//               <div className="text-sm text-slate-600">Loading…</div>
//             )}
//             {isEdit && editQ.isError && (
//               <div className="text-base font-bold text-red-700">
//                 {friendlyError(editQ.error)}
//               </div>
//             )}

//             <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr_0.8fr] gap-3">
//               {/* LEFT - 60% */}
//               <div className="space-y-3">
//                 {isCreate && (
//                   <Section
//                     title="📍 Location"
//                     bgColor="bg-red-400/10"
//                     borderColor="border-amber-200"
//                   >
//                     <div className="grid grid-cols-2 gap-2.5">
//                       <Field label="County">
//                         <select
//                           value={mCounty}
//                           onChange={(e) => setMCounty(e.target.value)}
//                           className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold"
//                         >
//                           <option value="">Select</option>
//                           {counties.map((c) => (
//                             <option key={c.countyId} value={c.countyId}>
//                               {c.countyName}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>

//                       <Field label="District">
//                         <select
//                           value={mDistrict}
//                           onChange={(e) => setMDistrict(e.target.value)}
//                           disabled={!mCounty}
//                           className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
//                         >
//                           <option value="">Select</option>
//                           {mDistricts.map((d) => (
//                             <option key={d.districtId} value={d.districtId}>
//                               {d.districtName}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>

//                       <Field label="Center">
//                         <select
//                           value={selectedCenter}
//                           onChange={(e) => {
//                             setSelectedCenter(e.target.value);
//                             setSelectedPlace("");
//                           }}
//                           disabled={!mCounty && !mDistrict}
//                           className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
//                         >
//                           <option value="">Select</option>
//                           {mCenters.map((c) => (
//                             <option key={c.centerId} value={c.centerId}>
//                               {c.centerName}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>

//                       <Field label="Place">
//                         <select
//                           value={selectedPlace}
//                           onChange={(e) => setSelectedPlace(e.target.value)}
//                           disabled={!selectedCenter}
//                           className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
//                         >
//                           <option value="">Select</option>
//                           {mPlaces.map((p) => (
//                             <option key={(p as any).placeId} value={(p as any).placeId}>
//                               {placeLabel(p) || "—"}
//                             </option>
//                           ))}
//                         </select>
//                       </Field>
//                     </div>
//                   </Section>
//                 )}

//                 <Section
//                   title="👥 Votes Sheet"
//                   bgColor="bg-blue-600/10"
//                   borderColor="border-purple-200"
//                   right={
//                     selectedContest ? (
//                       <button
//                         type="button"
//                         className="h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-bold hover:bg-slate-50"
//                         onClick={() => setCandidateVotes({})}
//                       >
//                         Clear
//                       </button>
//                     ) : null
//                   }
//                 >
//                   <div>
//                     <Field label="Contest">
//                       <select
//                         value={selectedContest}
//                         onChange={(e) => setSelectedContest(e.target.value)}
//                         disabled={isEdit && Boolean((editQ.data as any)?.contestId)}
//                         className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-base font-semibold disabled:bg-slate-50"
//                       >
//                         <option value="">Select</option>
//                         {props.contests.map((ct: ContestDto) => (
//                           <option key={ct.contestId} value={ct.contestId}>
//                             {ct.contestName}
//                           </option>
//                         ))}
//                       </select>
//                     </Field>

//                     {!selectedContest ? (
//                       <div className="mt-2 text-sm text-slate-600">Select contest</div>
//                     ) : contestOptionsQ.isLoading ? (
//                       <div className="mt-2 text-sm text-slate-600">Loading…</div>
//                     ) : contestOptionsQ.isError ? (
//                       <div className="mt-2 text-sm font-bold text-red-700">
//                         {friendlyError(contestOptionsQ.error)}
//                       </div>
//                     ) : !candidateOptions.length ? (
//                       <div className="mt-2 text-sm text-slate-600">No candidates</div>
//                     ) : (
//                       <div className="mt-2 rounded-lg border border-slate-200 overflow-hidden max-h-[350px] overflow-y-auto bg-white">
//                         <table className="w-full text-base">
//                           <thead className="bg-purple-100 sticky top-0">
//                             <tr>
//                               <th className="px-3 py-2 text-left font-bold text-slate-600">
//                                 Candidate
//                               </th>
//                               <th className="px-3 py-2 text-left font-bold text-slate-600 w-24">
//                                 Party
//                               </th>
//                               <th className="px-3 py-2 text-right font-bold text-slate-600 w-20">
//                                 Votes
//                               </th>
//                             </tr>
//                           </thead>
//                           <tbody>
//                             {candidateOptions.map((o: any, idx: number) => {
//                               const voteKey = String(o.electId ?? o.optionId ?? o.id ?? o.key);
//                               const votes = candidateVotes[voteKey] ?? 0;
//                               const name = o.electionCandidate || o.candidateName || o.label || voteKey;
//                               const party = o.abbreviation || o.partyAbbreviation || "";

//                               return (
//                                 <tr
//                                   key={voteKey}
//                                   className={`border-t border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-purple-50/30"
//                                     }`}
//                                 >
//                                   <td className="px-3 py-2 font-semibold text-slate-900">
//                                     {name}
//                                   </td>
//                                   <td className="px-3 py-2">
//                                     <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-base font-bold text-slate-700">
//                                       {party || "—"}
//                                     </span>
//                                   </td>
//                                   <td className="px-3 py-2 text-right">
//                                     <input
//                                       type="number"
//                                       min={0}
//                                       inputMode="numeric"
//                                       value={String(votes)}
//                                       onChange={(e) => {
//                                         const n = clampNum(e.target.value);
//                                         setCandidateVotes((s) => ({ ...s, [voteKey]: n }));
//                                       }}
//                                       className="h-7 w-18 rounded-md border border-slate-200 bg-white px-2 text-right text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-400"
//                                     />
//                                   </td>
//                                 </tr>
//                               );
//                             })}
//                           </tbody>
//                         </table>
//                       </div>
//                     )}
//                   </div>
//                 </Section>
//               </div>

//               {/* CENTER - 30% */}
//               <div className="space-y-3">
//                 <Section
//                   title="📦 Ballots"
//                   bgColor="bg-red-100/50"
//                   borderColor="border-green-200"
//                 >
//                   <div className="space-y-2">
//                     <Stat label="In Box" value={String(ballotsInBoxNumber)} />
//                     <Stat label="Invalid" value={String(invalidTotalNumber)} />
//                     <Stat label="Outside" value={String(outsideBoxNumber)} />
//                     <Stat
//                       label="Issued"
//                       value={
//                         placeAllocQ.isFetching
//                           ? "…"
//                           : expectedBallotsIssued == null
//                             ? "—"
//                             : String(expectedBallotsIssued)
//                       }
//                     />
//                     <Stat
//                       label="Voters"
//                       value={
//                         placeAllocQ.isFetching
//                           ? "…"
//                           : expectedRegisteredVoters == null
//                             ? "—"
//                             : String(expectedRegisteredVoters)
//                       }
//                     />

//                     {(exceedsIssued || exceedsRegistered) && (
//                       <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm font-bold text-red-700">
//                         ⚠️ Exceeds limit
//                       </div>
//                     )}

//                     <div className="space-y-1.5 pt-2 border-t border-green-600">
//                       <SmallNumberField
//                         label="Received"
//                         value={ballotsReceived}
//                         onChange={setBallotsReceived}
//                       />
//                       <SmallNumberField
//                         label="Invalid"
//                         value={invalidBallots}
//                         onChange={setInvalidBallots}
//                       />
//                       <SmallNumberField
//                         label="Rejected"
//                         value={rejectedBallots}
//                         onChange={setRejectedBallots}
//                       />
//                       <SmallNumberField
//                         label="Unmarked"
//                         value={unmarkedBallots}
//                         onChange={setUnmarkedBallots}
//                       />
//                       <SmallNumberField
//                         label="Spoiled"
//                         value={spoiledBallots}
//                         onChange={setSpoiledBallots}
//                       />
//                       <SmallNumberField
//                         label="Unused"
//                         value={unusedBallots}
//                         onChange={setUnusedBallots}
//                       />
//                     </div>
//                   </div>
//                 </Section>
//               </div>

//               {/* RIGHT - 20% (sidebar) */}
//               <div className="space-y-3">
//                 <Section
//                   title="📷 Evidence"
//                   bgColor="bg-slate-200"
//                   borderColor="border-cyan-200"
//                 >
//                   <div
//                     className={`rounded-lg border p-2.5 transition ${isDragging
//                         ? "border-blue-300 bg-blue-500"
//                         : "border-slate-200 bg-slate-50"
//                       }`}
//                   >
//                     <div
//                       className="text-center cursor-pointer"
//                       onClick={openFileDialog}
//                       onDrop={onDrop}
//                       onDragOver={onDragOver}
//                       onDragLeave={onDragLeave}
//                     >
//                       <input
//                         ref={fileInputRef}
//                         type="file"
//                         multiple
//                         accept="image/*,.pdf"
//                         className="hidden"
//                         onChange={handleFileInputChange}
//                       />
//                       <UploadCloud className="h-5 w-5 mx-auto mb-1 text-slate-600" />
//                       <div className="text-base font-bold text-slate-600">Drop here</div>
//                       <div className="text-xs text-slate-500">{files.length} file(s)</div>
//                     </div>

//                     {previews.length > 0 && (
//                       <div className="mt-2 space-y-1.5 max-h-[120px] overflow-y-auto">
//                         {previews.map((p, i) => (
//                           <div
//                             key={`${p.name}-${i}`}
//                             className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex items-center gap-2"
//                           >
//                             <div className="h-6 w-6 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center flex-shrink-0">
//                               {p.type.includes("pdf") ? (
//                                 <FileText className="h-3 w-3" />
//                               ) : (
//                                 <ImageIcon className="h-3 w-3" />
//                               )}
//                             </div>
//                             <div className="flex-1 min-w-0">
//                               <div className="text-base font-bold truncate">{p.name}</div>
//                             </div>
//                             <button
//                               type="button"
//                               className="p-0.5 hover:bg-slate-100 rounded"
//                               onClick={() => removeFile(i)}
//                             >
//                               <X className="h-3 w-3" />
//                             </button>
//                           </div>
//                         ))}
//                       </div>
//                     )}
//                   </div>
//                 </Section>

//                 <Section
//                   title="📝 Notes"
//                   bgColor="bg-orange-50"
//                   borderColor="border-orange-200"
//                 >
//                   <textarea
//                     value={comments}
//                     onChange={(e) => setComments(e.target.value)}
//                     rows={3}
//                     className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold"
//                     placeholder="Notes"
//                   />

//                   <label className="mt-2 flex items-center gap-2 text-base font-bold cursor-pointer">
//                     <input
//                       type="checkbox"
//                       checked={flagChecked}
//                       onChange={(e) => setFlagChecked(e.target.checked)}
//                       className="h-4 w-4"
//                     />
//                     <span>Flag</span>
//                   </label>

//                   {flagChecked && (
//                     <textarea
//                       value={flagReason}
//                       onChange={(e) => setFlagReason(e.target.value)}
//                       rows={2}
//                       className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-base font-semibold"
//                       placeholder="Reason"
//                     />
//                   )}

//                   <button
//                     type="button"
//                     className="mt-2 w-full text-left px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 font-bold text-sm flex items-center justify-between"
//                     onClick={() => setAdvancedOpen((s) => !s)}
//                   >
//                     <span>🗺️ GPS</span>
//                     {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={14} />}
//                   </button>

//                   {advancedOpen && (
//                     <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-200">
//                       <SmallField label="Lat">
//                         <input
//                           type="number"
//                           step="any"
//                           value={String(latitude)}
//                           onChange={(e) =>
//                             setLatitude(e.target.value === "" ? "" : Number(e.target.value))
//                           }
//                           className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-base font-semibold"
//                         />
//                       </SmallField>
//                       <SmallField label="Lon">
//                         <input
//                           type="number"
//                           step="any"
//                           value={String(longitude)}
//                           onChange={(e) =>
//                             setLongitude(e.target.value === "" ? "" : Number(e.target.value))
//                           }
//                           className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-semibold"
//                         />
//                       </SmallField>
//                       <button
//                         type="button"
//                         className="w-full h-8 rounded-lg border border-slate-200 bg-white text-sm font-bold hover:bg-slate-50"
//                         onClick={() => {
//                           if (!("geolocation" in navigator)) {
//                             setGeoStatus("N/A");
//                             return;
//                           }
//                           navigator.geolocation.getCurrentPosition(
//                             (pos) => {
//                               setLatitude(Number(pos.coords.latitude));
//                               setLongitude(Number(pos.coords.longitude));
//                               setGeoStatus("✓");
//                             },
//                             () => setGeoStatus("✕"),
//                             { enableHighAccuracy: true, timeout: 8000, maximumAge: 10_000 }
//                           );
//                         }}
//                       >
//                         Use GPS
//                       </button>
//                     </div>
//                   )}
//                 </Section>
//               </div>
//             </div>

//             {isCreate && createM.isError && (
//               <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-base font-bold text-red-700">
//                 {friendlyError(createM.error)}
//               </div>
//             )}
//             {isEdit && (updateM.isError || flagM.isError) && (
//               <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-base font-bold text-red-700">
//                 {friendlyError(updateM.error || flagM.error)}
//               </div>
//             )}
//           </div>

//           {/* footer */}
//           <div className="sticky bottom-0 border-t bg-white px-3 py-3 flex flex-wrap items-center gap-2">
//             <button
//               type="button"
//               onClick={props.onClose}
//               disabled={busy}
//               className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-base font-bold hover:bg-slate-50 disabled:opacity-60"
//             >
//               Cancel
//             </button>

//             {isEdit && (
//               <button
//                 type="button"
//                 disabled={
//                   busy || !props.submissionId || editQ.isLoading || (flagChecked && !flagReason.trim())
//                 }
//                 onClick={() => {
//                   if (!props.submissionId) return;
//                   if (flagChecked) {
//                     if (!flagReason.trim()) {
//                       alert("Reason required");
//                       return;
//                     }
//                     flagM.mutate({ id: props.submissionId, flagged: true, comments: flagReason });
//                     return;
//                   }
//                   if (!confirm("Unflag?")) return;
//                   flagM.mutate({ id: props.submissionId, flagged: false });
//                 }}
//                 className={`h-9 rounded-lg px-4 text-base font-bold text-white ${busy ? "bg-slate-400" : isFlagged ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-black"
//                   }`}
//               >
//                 {flagChecked ? "Flag" : "Unflag"}
//               </button>
//             )}

//             {isCreate && (
//               <>
//                 <button
//                   type="button"
//                   disabled={!canSaveDraft}
//                   onClick={() => {
//                     if (!orgIdForCreate) {
//                       alert("Select tenant");
//                       return;
//                     }
//                     const req = buildCreateReq(true);
//                     createM.mutate(req, { onSuccess: () => props.onClose() });
//                   }}
//                   className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-base font-bold hover:bg-slate-50 disabled:opacity-60"
//                 >
//                   Draft
//                 </button>

//                 <button
//                   type="button"
//                   disabled={!canActuallySubmit}
//                   onClick={() => {
//                     if (!orgIdForCreate || exceedsIssued || exceedsRegistered) return;
//                     const req = buildCreateReq(false);
//                     createM.mutate(req, { onSuccess: () => props.onClose() });
//                   }}
//                   className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white px-4 text-base font-bold disabled:bg-slate-400"
//                 >
//                   Submit
//                 </button>
//               </>
//             )}

//             {isEdit && (
//               <>
//                 {isDraft && (
//                   <button
//                     type="button"
//                     disabled={!canSubmitEditDraft}
//                     onClick={() => {
//                       if (!props.submissionId) return;
//                       const req = buildUpdateReq();
//                       updateM.mutate(
//                         {
//                           id: props.submissionId,
//                           req,
//                           files: files.length ? files : undefined,
//                         },
//                         { onSuccess: () => props.onClose() }
//                       );
//                     }}
//                     className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white px-4 text-base font-bold disabled:bg-slate-400"
//                   >
//                     Submit
//                   </button>
//                 )}
//                 <button
//                   type="button"
//                   disabled={updateM.isPending || !props.submissionId}
//                   onClick={() => {
//                     if (!props.submissionId) return;
//                     const req = buildUpdateReq();
//                     updateM.mutate(
//                       {
//                         id: props.submissionId,
//                         req,
//                         files: files.length ? files : undefined,
//                       },
//                       { onSuccess: () => props.onClose() }
//                     );
//                   }}
//                   className="h-9 rounded-lg bg-slate-900 hover:bg-black text-white px-4 text-base font-bold disabled:bg-slate-400"
//                 >
//                   Save
//                 </button>
//               </>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// /** components */
// function Section(props: {
//   title?: string;
//   bgColor?: string;
//   borderColor?: string;
//   right?: React.ReactNode;
//   children: React.ReactNode;
// }) {
//   const bg = props.bgColor || "bg-white";
//   const border = props.borderColor || "border-slate-200";

//   return (
//     <div className={`rounded-xl border ${border} ${bg} px-3 py-3`}>
//       {props.title && (
//         <div className="flex items-center justify-between gap-2 mb-2">
//           <div className="text-xl font-bold text-slate-900">{props.title}</div>
//           {props.right}
//         </div>
//       )}
//       {props.children}
//     </div>
//   );
// }

// function Field(props: { label: string; children: React.ReactNode }) {
//   return (
//     <div>
//       <div className="text-sm font-bold text-slate-600 mb-1">{props.label}</div>
//       {props.children}
//     </div>
//   );
// }

// function SmallField(props: { label: string; children: React.ReactNode }) {
//   return (
//     <div>
//       <div className="text-sm font-bold text-slate-600 mb-0.5">{props.label}</div>
//       {props.children}
//     </div>
//   );
// }

// function Stat(props: { label: string; value: string }) {
//   return (
//     <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2">
//       <span className="text-base font-bold text-slate-600">{props.label}</span>
//       <span className="text-xl font-extrabold text-slate-900">{props.value}</span>
//     </div>
//   );
// }

// function SmallNumberField(props: { label: string; value: number | ""; onChange: (v: number | "") => void }) {
//   return (
//     <div className="flex items-center gap-2">
//       <label className="text-base font-bold text-slate-600 w-19">{props.label}</label>
//       <input
//         type="number"
//         min={0}
//         inputMode="numeric"
//         value={String(props.value)}
//         onChange={(e) => props.onChange(e.target.value === "" ? "" : clampNum(e.target.value))}
//         className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-right text-xl font-bold focus:outline-none focus:ring-1 focus:ring-slate-200"
//       />
//     </div>
//   );
// }

