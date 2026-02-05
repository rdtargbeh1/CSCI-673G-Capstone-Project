

//// SubmissionFormModal.tsx
// ✅ FULL FINAL UPDATED CODE
//
// ✅ NEW RULE ALIGNMENT (BallotsInBox)
// - ballotsInBox = validVotes + invalid + rejected + unmarked
// - spoiledBallots is OUTSIDE the box (NOT part of ballotsInBox, NOT part of invalidTotal)
// - invalidTotal = invalid + rejected + unmarked
// - outsideBox = unused + spoiled
// - UI labels updated (Cast -> In Box)
// - Payload updated to send ballotsInBox (not ballotsCast)
//
// ✅ UI (NO SCROLL IMPROVEMENTS)
// - Invalid Total (auto) + Outside Box (auto) are on SAME ROW (side-by-side)
// - Ballots Issued (expected) + Registered Voters (expected) are on SAME ROW (side-by-side)
//
// ✅ FIX
// - Fixed missing closing `}` after previews ternary (Vite/SWC Unterminated regexp literal)
//
// ✅ OTHER FIXES KEPT
// - Flag UI in form (checkbox + reason textarea) for CREATE + EDIT
// - Sends required backend fields: actorUserId + flagged + comments
// - Shows Actor name (from /users/me when possible)
// - CREATE: if “Flag this submission” is checked, it flags immediately AFTER create succeeds
// - EDIT: Apply Flag / Unflag uses the checkbox + reason (no prompt)
// - FIX: typo flagded -> flagged
// - Keeps previous logic + validations
// - Keeps edit first-open candidate votes fix (only clear votes on contest change in CREATE mode)

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

/** ---------------- helpers ---------------- */
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
  const a = String(u?.firstName ?? "")
    .trim()
    .slice(0, 1);
  const b = String(u?.lastName ?? "")
    .trim()
    .slice(0, 1);
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

  /** ---------------- Agent (try /users/me when org provided) ---------------- */
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

  /** ---------------- Location chain (create only) ---------------- */
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

  /** ---------------- Contest + candidates ---------------- */
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

  /** ---------------- Shared fields ---------------- */
  const [candidateVotes, setCandidateVotes] = useState<Record<string, number>>(
    {}
  );
  const [invalidBallots, setInvalidBallots] = useState<number | "">("");
  const [rejectedBallots, setRejectedBallots] = useState<number | "">("");
  const [spoiledBallots, setSpoiledBallots] = useState<number | "">("");
  const [unmarkedBallots, setUnmarkedBallots] = useState<number | "">("");
  const [unusedBallots, setUnusedBallots] = useState<number | "">("");

  // ✅ allocation read-only
  const [expectedRegisteredVoters, setExpectedRegisteredVoters] = useState<
    number | null
  >(null);
  const [expectedBallotsIssued, setExpectedBallotsIssued] = useState<
    number | null
  >(null);

  // ✅ flag UI
  const [flagChecked, setFlagChecked] = useState(false);
  const [flagReason, setFlagReason] = useState("");

  const [comments, setComments] = useState<string>("");
  const [latitude, setLatitude] = useState<number | "">("");
  const [longitude, setLongitude] = useState<number | "">("");
  const [geoStatus, setGeoStatus] = useState<string>("");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  /** ---------------- Evidence uploader ---------------- */
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

  // ✅ NEW RULE: ballotsInBox EXCLUDES spoiled (spoiled is outside the box)
  const ballotsInBoxNumber = useMemo(() => {
    return (
      validVotes +
      (Number(invalidBallots) || 0) +
      (Number(rejectedBallots) || 0) +
      (Number(unmarkedBallots) || 0)
    );
  }, [validVotes, invalidBallots, rejectedBallots, unmarkedBallots]);

  // ✅ invalidTotal (in-box non-valid)
  const invalidTotalNumber = useMemo(() => {
    return (
      (Number(invalidBallots) || 0) +
      (Number(rejectedBallots) || 0) +
      (Number(unmarkedBallots) || 0)
    );
  }, [invalidBallots, rejectedBallots, unmarkedBallots]);

  // ✅ outside box = unused + spoiled
  const outsideBoxNumber = useMemo(() => {
    return (Number(unusedBallots) || 0) + (Number(spoiledBallots) || 0);
  }, [unusedBallots, spoiledBallots]);

  const exceedsIssued =
    expectedBallotsIssued != null && ballotsInBoxNumber > expectedBallotsIssued;

  const exceedsRegistered =
    expectedRegisteredVoters != null &&
    ballotsInBoxNumber > expectedRegisteredVoters;

  /** ---------------- Auto geolocation on create open */
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

  /** ---------------- Reset on open */
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
      setInvalidBallots("");
      setRejectedBallots("");
      setSpoiledBallots("");
      setUnmarkedBallots("");
      setUnusedBallots("");
      setComments("");
      setExpectedRegisteredVoters(null);
      setExpectedBallotsIssued(null);

      // ✅ reset flag UI for new create
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

  // ✅ FIX: only clear votes when contest changes in CREATE mode.
  useEffect(() => {
    if (!visible) return;
    if (!isCreate) return;
    setCandidateVotes({});
  }, [selectedContest, visible, isCreate]);

  /** ---------------- Edit: load + hydrate */
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

    // ✅ hydrate flag UI from status/comments
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

  /** ---------------- Place allocation (CREATE) */
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

  /** ---------------- Mutations */
  const createM = useMutation({
    mutationFn: async (req: VoteSubmissionCreateRequest) =>
      createSubmissionMultipart({ payload: req, files }),
    onSuccess: async (created: any) => {
      // ✅ if checkbox checked, flag immediately after create
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
        flagged: p.flagged, // ✅ FIXED
        comments: p.comments, // ✅ plural
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

  // ✅ must never exceed issued/registered when known
  const reconcileOk = !exceedsIssued && !exceedsRegistered;

  const canActuallySubmit =
    baseReady && files.length > 0 && flagReasonOk && reconcileOk;
  const canSaveDraft = baseReady && flagReasonOk;

  const canSubmitEditDraft =
    props.canCreate &&
    Boolean(props.submissionId) &&
    isDraft &&
    files.length > 0 &&
    !updateM.isPending &&
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

      // ✅ NEW: send ballotsInBox (auto) — excludes spoiled
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

      // ✅ NEW: send ballotsInBox (auto) — excludes spoiled
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
        <div className="w-full sm:max-w-3xl md:max-w-5xl lg:max-w-6xl bg-white rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col h-[calc(100vh-8px)] sm:h-auto sm:max-h-[82vh] overflow-hidden">
          {/* header */}
          <div className="sticky top-0 z-10 border-b bg-white px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold leading-5">
                  {isCreate ? "New Vote Submission" : "Edit Submission"}
                </div>
                <div className="text-[11px] text-slate-500 truncate mt-0.5">
                  {headerSubtitle}
                </div>

                {isCreate &&
                props.dashboardMode === "SYSTEM" &&
                !props.effectiveOrgId ? (
                  <div className="mt-1 text-[11px] font-bold text-red-700">
                    Select a tenant (organization) before submitting.
                  </div>
                ) : null}
              </div>

              <button
                type="button"
                onClick={props.onClose}
                disabled={busy}
                className={`shrink-0 rounded-full border border-slate-200 bg-white h-9 w-9 grid place-items-center ${
                  busy ? "opacity-60" : "hover:bg-slate-50"
                }`}
                aria-label="Close"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
                <div className="h-7 w-7 rounded-full bg-slate-900 text-white text-xs font-extrabold grid place-items-center">
                  {agentInitials}
                </div>
                <div className="text-sm font-bold">
                  <span className="text-slate-500 text-xs font-extrabold mr-1">
                    Agent
                  </span>
                  <span className="font-extrabold">{agentName}</span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                <span className="text-[11px] text-slate-500 font-extrabold">
                  Valid
                </span>
                <span className="text-sm font-extrabold">{validVotes}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                <span className="text-[11px] text-slate-500 font-extrabold">
                  In Box
                </span>
                <span className="text-sm font-extrabold">
                  {ballotsInBoxNumber}
                </span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1">
                <span className="text-[11px] text-slate-500 font-extrabold">
                  Invalid Total
                </span>
                <span className="text-sm font-extrabold">
                  {invalidTotalNumber}
                </span>
              </div>
            </div>
          </div>

          {/* body */}
          <div className="flex-1 overflow-y-auto px-3 py-3 pb-28">
            {isEdit ? (
              editQ.isLoading ? (
                <Section>
                  <div className="text-sm text-slate-600">
                    Loading submission…
                  </div>
                </Section>
              ) : editQ.isError ? (
                <Section>
                  <div className="text-sm font-bold text-red-700">
                    {friendlyError(editQ.error)}
                  </div>
                </Section>
              ) : null
            ) : null}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-3">
              {/* LEFT */}
              <div className="space-y-3">
                {isCreate && (
                  <Section title="Location">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <Field label="County">
                        <select
                          value={mCounty}
                          onChange={(e) => setMCounty(e.target.value)}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                        >
                          <option value="">Select county</option>
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
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                        >
                          <option value="">Select district</option>
                          {mDistricts.map((d) => (
                            <option key={d.districtId} value={d.districtId}>
                              {d.districtName}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Polling Center">
                        <select
                          value={selectedCenter}
                          onChange={(e) => {
                            setSelectedCenter(e.target.value);
                            setSelectedPlace("");
                          }}
                          disabled={!mCounty && !mDistrict}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                        >
                          <option value="">Select center</option>
                          {mCenters.map((c) => (
                            <option key={c.centerId} value={c.centerId}>
                              {c.centerName}
                            </option>
                          ))}
                        </select>
                      </Field>

                      <Field label="Polling Place">
                        <select
                          value={selectedPlace}
                          onChange={(e) => setSelectedPlace(e.target.value)}
                          disabled={!selectedCenter}
                          className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                        >
                          <option value="">Select place</option>
                          {mPlaces.map((p) => (
                            <option
                              key={(p as any).placeId}
                              value={(p as any).placeId}
                            >
                              {placeLabel(p) || "—"}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </Section>
                )}

                <Section
                  title="Votes Sheet"
                  right={
                    selectedContest ? (
                      <button
                        type="button"
                        className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-extrabold hover:bg-slate-50"
                        onClick={() => setCandidateVotes({})}
                      >
                        Clear all
                      </button>
                    ) : null
                  }
                >
                  <div className="space-y-2.5">
                    <div>
                      <div className="mb-1 text-[11px] font-extrabold text-slate-600">
                        Contest
                      </div>
                      <select
                        value={selectedContest}
                        onChange={(e) => setSelectedContest(e.target.value)}
                        disabled={
                          isEdit && Boolean((editQ.data as any)?.contestId)
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold disabled:bg-slate-50"
                      >
                        <option value="">Select contest</option>
                        {props.contests.map((ct: ContestDto) => (
                          <option key={ct.contestId} value={ct.contestId}>
                            {ct.contestName}{" "}
                            {ct.category ? `(${ct.category})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!selectedContest ? (
                      <div className="text-sm text-slate-600">
                        Select a contest to enter candidate votes.
                      </div>
                    ) : contestOptionsQ.isLoading ? (
                      <div className="text-sm text-slate-600">
                        Loading candidates…
                      </div>
                    ) : contestOptionsQ.isError ? (
                      <div className="text-sm font-bold text-red-700">
                        {friendlyError(contestOptionsQ.error)}
                      </div>
                    ) : !candidateOptions.length ? (
                      <div className="text-sm text-slate-600">
                        No candidate options assigned to this contest yet.
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[480px]">
                            <thead className="bg-slate-50">
                              <tr className="text-left">
                                <th className="px-2.5 py-2 text-[11px] font-extrabold text-slate-600">
                                  Candidate
                                </th>
                                <th className="px-2.5 py-2 text-[11px] font-extrabold text-slate-600 w-[110px]">
                                  Party
                                </th>
                                <th className="px-2.5 py-2 text-[11px] font-extrabold text-slate-600 w-[110px] text-right">
                                  Votes
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {candidateOptions.map((o: any, idx: number) => {
                                const voteKey = String(
                                  o.electId ?? o.optionId ?? o.id ?? o.key
                                );
                                const votes = candidateVotes[voteKey] ?? 0;
                                const name =
                                  o.electionCandidate ??
                                  o.candidateName ??
                                  o.optionLabel ??
                                  o.label ??
                                  o.name ??
                                  voteKey;
                                const party =
                                  o.abbreviation ??
                                  o.partyAbbreviation ??
                                  o.partyCode ??
                                  o.partyName ??
                                  "";

                                return (
                                  <tr
                                    key={voteKey}
                                    className={`border-t border-slate-200 ${
                                      idx % 2 === 0
                                        ? "bg-white"
                                        : "bg-slate-50/40"
                                    }`}
                                  >
                                    <td className="px-2.5 py-2 align-middle">
                                      <div className="text-sm font-extrabold leading-5 break-words">
                                        {name}
                                      </div>
                                    </td>
                                    <td className="px-2.5 py-2 align-middle">
                                      <span
                                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                                          party
                                            ? "bg-slate-100 text-slate-700"
                                            : "bg-slate-100 text-slate-500"
                                        }`}
                                      >
                                        {party || "—"}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 align-middle">
                                      <div className="flex justify-end">
                                        <input
                                          type="number"
                                          min={0}
                                          inputMode="numeric"
                                          value={String(votes)}
                                          onChange={(e) => {
                                            const n = clampNum(e.target.value);
                                            setCandidateVotes((s) => ({
                                              ...s,
                                              [voteKey]: n,
                                            }));
                                          }}
                                          className="h-7 w-[64px] rounded-md border border-slate-200 bg-white px-1.5 text-right text-[12px] font-extrabold leading-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                                        />
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </Section>
              </div>

              {/* RIGHT */}
              <div className="space-y-3">
                <Section title="Ballots Summary">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="col-span-2">
                      <ReadOnlyStat
                        label="Ballots In Box (auto)"
                        value={String(ballotsInBoxNumber)}
                      />
                    </div>

                    {/* ✅ SAME ROW */}
                    <div className="col-span-1">
                      <ReadOnlyStat
                        label="Invalid Total (auto)"
                        value={String(invalidTotalNumber)}
                      />
                    </div>
                    <div className="col-span-1">
                      <ReadOnlyStat
                        label="Outside Box (auto)"
                        value={String(outsideBoxNumber)}
                      />
                    </div>

                    {/* ✅ SAME ROW */}
                    <div className="col-span-1">
                      <ReadOnlyStat
                        label="Ballots Issued (expected)"
                        value={
                          placeAllocQ.isFetching
                            ? "Loading…"
                            : expectedBallotsIssued == null
                            ? "—"
                            : String(expectedBallotsIssued)
                        }
                      />
                    </div>

                    <div className="col-span-1">
                      <ReadOnlyStat
                        label="Registered Voters (expected)"
                        value={
                          placeAllocQ.isFetching
                            ? "Loading…"
                            : expectedRegisteredVoters == null
                            ? "—"
                            : String(expectedRegisteredVoters)
                        }
                      />
                    </div>

                    {exceedsIssued ? (
                      <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700">
                        Ballots In Box cannot exceed Ballots Issued.
                      </div>
                    ) : null}

                    {exceedsRegistered ? (
                      <div className="col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-700">
                        Ballots In Box cannot exceed Registered Voters.
                      </div>
                    ) : null}

                    <NumberField
                      label="Invalid (In Box)"
                      value={invalidBallots}
                      onChange={setInvalidBallots}
                    />
                    <NumberField
                      label="Rejected (In Box)"
                      value={rejectedBallots}
                      onChange={setRejectedBallots}
                    />
                    <NumberField
                      label="Spoiled (Outside Box)"
                      value={spoiledBallots}
                      onChange={setSpoiledBallots}
                    />
                    <NumberField
                      label="Unmarked (In Box)"
                      value={unmarkedBallots}
                      onChange={setUnmarkedBallots}
                    />

                    <div className="col-span-2">
                      <NumberField
                        label="Unused (Outside Box)"
                        value={unusedBallots}
                        onChange={setUnusedBallots}
                      />
                    </div>
                  </div>
                </Section>

                <Section title="Tally Sheet (Required)">
                  <div
                    className={`rounded-xl border ${
                      isDragging
                        ? "border-blue-300 bg-blue-50"
                        : "border-slate-200 bg-slate-50"
                    } p-2`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-white border border-slate-200 grid place-items-center">
                        <UploadCloud className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-extrabold leading-5">
                          Upload
                        </div>
                        <div className="text-[11px] text-slate-600">
                          PNG / JPG / PDF
                        </div>
                      </div>

                      <div className="text-[11px] font-bold text-slate-600">
                        {files.length ? `${files.length}` : "0"}
                      </div>
                    </div>

                    <div
                      className="mt-2 w-full"
                      onClick={openFileDialog}
                      onDrop={onDrop}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                      role="button"
                      tabIndex={0}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      <div className="h-8 w-full rounded-lg border border-slate-200 bg-white grid place-items-center text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                        Tap to choose or drop
                      </div>
                    </div>

                    {isCreate && !files.length && (
                      <div className="mt-2 text-xs font-bold text-red-700">
                        Tally sheet is required to Submit. (Draft can be saved
                        without evidence.)
                      </div>
                    )}

                    {/* ✅ FIXED: proper closing } for ternary */}
                    {previews.length ? (
                      <div className="mt-2 grid grid-cols-1 gap-1.5">
                        {previews.map((p, i) => (
                          <div
                            key={`${p.name}-${i}`}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 flex items-center gap-2"
                          >
                            <div className="h-7 w-7 rounded-lg bg-slate-50 border border-slate-200 grid place-items-center shrink-0">
                              {p.type.includes("pdf") ? (
                                <FileText className="h-4 w-4" />
                              ) : (
                                <ImageIcon className="h-4 w-4" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="text-[12px] font-bold truncate">
                                {p.name}
                              </div>
                            </div>

                            {p.url ? (
                              <img
                                src={p.url}
                                alt={p.name}
                                className="h-7 w-7 rounded-lg object-cover border border-slate-200"
                              />
                            ) : null}

                            <button
                              type="button"
                              title="Remove file"
                              className="rounded-lg border border-slate-200 bg-white p-1 hover:bg-slate-50"
                              onClick={() => removeFile(i)}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </Section>

                <Section title="Notes">
                  {/* ✅ FLAG UI (checkbox + actor + reason) */}
                  <div className="mb-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm font-extrabold">
                        <input
                          type="checkbox"
                          checked={flagChecked}
                          onChange={(e) => setFlagChecked(e.target.checked)}
                          className="h-4 w-4"
                        />
                        <span>Flag this submission</span>
                      </label>

                      <div className="text-[11px] font-extrabold text-slate-600">
                        Actor:{" "}
                        <span className="text-slate-900">{agentName}</span>
                      </div>
                    </div>

                    {flagChecked && (
                      <div className="mt-2">
                        <div className="mb-1 text-[11px] font-extrabold text-slate-600">
                          Flag Reason (required)
                        </div>
                        <textarea
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                          placeholder="Why are you flagging this submission?"
                        />
                        {!flagReason.trim() ? (
                          <div className="mt-1 text-xs font-bold text-red-700">
                            Reason is required when flagging.
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>

                  <textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold"
                    placeholder="Write notes..."
                  />

                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-extrabold flex items-center justify-between hover:bg-slate-50"
                    onClick={() => setAdvancedOpen((s) => !s)}
                  >
                    <span>Advanced (Location)</span>
                    {advancedOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>

                  {advancedOpen && (
                    <div className="mt-2 space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Field label="Latitude">
                          <input
                            type="number"
                            step="any"
                            value={String(latitude)}
                            onChange={(e) =>
                              setLatitude(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                              )
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                          />
                        </Field>
                        <Field label="Longitude">
                          <input
                            type="number"
                            step="any"
                            value={String(longitude)}
                            onChange={(e) =>
                              setLongitude(
                                e.target.value === ""
                                  ? ""
                                  : Number(e.target.value)
                              )
                            }
                            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold"
                          />
                        </Field>
                      </div>

                      {geoStatus && (
                        <div className="text-xs font-bold text-slate-600">
                          {geoStatus}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
                          onClick={() => {
                            setGeoStatus("");
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
                              (err) =>
                                setGeoStatus(
                                  err?.message || "Location unavailable."
                                ),
                              {
                                enableHighAccuracy: true,
                                timeout: 8000,
                                maximumAge: 10_000,
                              }
                            );
                          }}
                        >
                          Use my location
                        </button>
                        <button
                          type="button"
                          className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold"
                          onClick={() => {
                            setLatitude("");
                            setLongitude("");
                            setGeoStatus("Location cleared.");
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </Section>
              </div>
            </div>

            {meQ.isError && (
              <div className="mt-3 text-[11px] font-bold text-amber-700">
                Could not load agent via /users/me (missing tenant header or
                backend restriction). Showing auth user fallback.
              </div>
            )}
            {placeAllocQ.isError && isCreate && selectedPlace ? (
              <div className="mt-3 text-[11px] font-bold text-amber-700">
                Could not load Polling Place Allocation for this place. Ballots
                Issued / Registered Voters will show as —.
              </div>
            ) : null}
            {isCreate && createM.isError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {friendlyError(createM.error)}
              </div>
            )}
            {isEdit && updateM.isError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {friendlyError(updateM.error)}
              </div>
            )}
            {isEdit && flagM.isError && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
                {friendlyError(flagM.error)}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="sticky bottom-0 z-10 border-t bg-white px-3 py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={props.onClose}
                disabled={busy}
                className={`h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold ${
                  busy ? "opacity-60" : "hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>

              {/* ✅ EDIT: Apply Flag / Unflag based on checkbox */}
              {isEdit ? (
                <button
                  type="button"
                  disabled={
                    busy ||
                    !props.submissionId ||
                    editQ.isLoading ||
                    (flagChecked && !flagReason.trim())
                  }
                  onClick={() => {
                    if (!props.submissionId) return;

                    if (flagChecked) {
                      const reason = flagReason.trim();
                      if (!reason) {
                        alert("Reason is required when flagging.");
                        return;
                      }
                      flagM.mutate({
                        id: props.submissionId,
                        flagged: true,
                        comments: reason,
                      });
                      return;
                    }

                    if (!confirm("Unflag this submission?")) return;
                    flagM.mutate({
                      id: props.submissionId,
                      flagged: false,
                      comments: undefined,
                    });
                  }}
                  className={`h-10 w-full sm:w-auto rounded-xl px-4 text-sm font-extrabold text-white ${
                    busy || !props.submissionId
                      ? "bg-slate-400"
                      : isFlagged
                      ? "bg-slate-700 hover:bg-slate-800"
                      : "bg-slate-900 hover:bg-black"
                  }`}
                >
                  {flagChecked ? "Apply Flag" : "Unflag"}
                </button>
              ) : null}

              {isCreate ? (
                <>
                  <button
                    type="button"
                    disabled={!canSaveDraft}
                    onClick={() => {
                      if (!orgIdForCreate) {
                        alert("Select a tenant (org) first.");
                        return;
                      }
                      if (flagChecked && !flagReason.trim()) {
                        alert("Reason is required when flagging.");
                        return;
                      }
                      const req = buildCreateReq(true);
                      createM.mutate(req, { onSuccess: () => props.onClose() });
                    }}
                    className={`h-10 w-full sm:w-auto rounded-xl border border-slate-200 bg-white px-4 text-sm font-extrabold ${
                      !canSaveDraft || createM.isPending
                        ? "opacity-60"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    Save Draft
                  </button>

                  <button
                    type="button"
                    disabled={!canActuallySubmit}
                    onClick={() => {
                      if (!orgIdForCreate) {
                        alert("Select a tenant (org) first.");
                        return;
                      }
                      if (flagChecked && !flagReason.trim()) {
                        alert("Reason is required when flagging.");
                        return;
                      }
                      if (exceedsIssued) {
                        alert("Ballots In Box cannot exceed Ballots Issued.");
                        return;
                      }
                      if (exceedsRegistered) {
                        alert(
                          "Ballots In Box cannot exceed Registered Voters."
                        );
                        return;
                      }
                      const req = buildCreateReq(false);
                      createM.mutate(req, { onSuccess: () => props.onClose() });
                    }}
                    className={`h-10 w-full sm:w-auto rounded-xl px-4 text-sm font-extrabold text-white ${
                      !canActuallySubmit || createM.isPending
                        ? "bg-slate-400"
                        : "bg-slate-900 hover:bg-black"
                    }`}
                  >
                    Submit
                  </button>
                </>
              ) : (
                <>
                  {isDraft ? (
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
                      className={`h-10 w-full sm:w-auto rounded-xl px-4 text-sm font-extrabold text-white ${
                        updateM.isPending
                          ? "bg-slate-400"
                          : "bg-slate-900 hover:bg-black"
                      }`}
                    >
                      Save Draft
                    </button>
                  ) : null}

                  {isDraft ? (
                    <button
                      type="button"
                      disabled={!canSubmitEditDraft}
                      onClick={() => {
                        if (!props.submissionId) return;
                        if (!files.length) {
                          alert("Upload tally sheet to submit this draft.");
                          return;
                        }
                        if (exceedsIssued) {
                          alert("Ballots In Box cannot exceed Ballots Issued.");
                          return;
                        }
                        if (exceedsRegistered) {
                          alert(
                            "Ballots In Box cannot exceed Registered Voters."
                          );
                          return;
                        }
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
                      className={`h-10 w-full sm:w-auto rounded-xl px-4 text-sm font-extrabold text-white ${
                        !canSubmitEditDraft
                          ? "bg-slate-400"
                          : "bg-slate-900 hover:bg-black"
                      }`}
                    >
                      Submit
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={updateM.isPending || !props.submissionId}
                      onClick={() => {
                        if (!props.submissionId) return;
                        if (exceedsIssued) {
                          alert("Ballots In Box cannot exceed Ballots Issued.");
                          return;
                        }
                        if (exceedsRegistered) {
                          alert(
                            "Ballots In Box cannot exceed Registered Voters."
                          );
                          return;
                        }
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
                      className={`h-10 w-full sm:w-auto rounded-xl px-4 text-sm font-extrabold text-white ${
                        updateM.isPending
                          ? "bg-slate-400"
                          : "bg-slate-900 hover:bg-black"
                      }`}
                    >
                      Save Changes
                    </button>
                  )}
                </>
              )}
            </div>

            {isCreate && (!props.effectiveOrgId || !files.length) && (
              <div className="mt-2 text-[11px] text-slate-600">
                Tip: Draft can be saved without evidence. Submit requires tally
                sheet.
              </div>
            )}
            {isEdit && isDraft && !files.length ? (
              <div className="mt-2 text-[11px] text-slate-600">
                Tip: Upload tally sheet to enable Submit for this draft.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- small components ---------- */
function Section(props: {
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3">
      {props.title ? (
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-sm font-extrabold">{props.title}</div>
          {props.right ? <div className="shrink-0">{props.right}</div> : null}
        </div>
      ) : null}
      {props.children}
    </div>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-extrabold text-slate-600">
        {props.label}
      </div>
      {props.children}
    </div>
  );
}

function ReadOnlyStat(props: { label: string; value: string }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-extrabold text-slate-600">
        {props.label}
      </div>
      <div className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 grid items-center">
        <span className="text-sm font-extrabold text-slate-900">
          {props.value}
        </span>
      </div>
    </div>
  );
}

function NumberField(props: {
  label: string;
  value: number | "";
  onChange: (v: number | "") => void;
}) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-extrabold text-slate-600">
        {props.label}
      </div>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={String(props.value)}
        onChange={(e) =>
          props.onChange(e.target.value === "" ? "" : clampNum(e.target.value))
        }
        className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-extrabold focus:outline-none focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}
