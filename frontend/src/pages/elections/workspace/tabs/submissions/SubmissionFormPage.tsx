// src/pages/elections/workspace/tabs/submissions/SubmissionFormPage.tsx

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  FileText,
  MapPin,
  Navigation,
  Paperclip,
  Pencil,
  Save,
  Send,
  UploadCloud,
  Vote,
  X,
} from "lucide-react";

import { useAuthStore } from "../../../../../shared/store/authStore";
import { Panel } from "../../../shared/elections-ui";

import { fetchCounties } from "../../../../../shared/services/countyService";
import { fetchDistrictsByCounty } from "../../../../../shared/services/districtService";
import { fetchPollingCenters } from "../../../../../shared/services/pollingCenterService";
import { fetchPollingPlaces } from "../../../../../shared/services/pollingPlaceService";
import { listContestsByElection } from "../../../../../shared/services/contestService";
import { listOptionsByContest } from "../../../../../shared/services/contestOptionService";
import { searchPlaceAllocations } from "../../../../../shared/services/pollingPlaceAllocationService";
import { fetchMe } from "../../../../../shared/services/userService";

import {
  createSubmissionMultipart,
  getSubmission,
  submitDraft,
  updateSubmissionJson,
  updateSubmissionMultipart,
  type VoteSubmissionCreateRequest,
  type VoteSubmissionUpdateRequest,
} from "../../../../../shared/services/voteSubmissionService";

// ============================================================================
// TYPES
// ============================================================================

type Mode = "create" | "edit";

type Props = {
  mode: Mode;
  submissionId?: string;
};

type SelectOption = {
  value: string;
  label: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function clamp(value: unknown) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function sumVotes(values: Record<string, number>) {
  return Object.values(values).reduce(
    (total, value) => total + (Number(value) || 0),
    0,
  );
}

function errorText(error: any) {
  return (
    error?.response?.data?.message ??
    error?.response?.data?.error ??
    error?.message ??
    "Request failed."
  );
}

function candidateLabel(option: any) {
  return (
    option?.electionCandidate ??
    option?.candidateName ??
    option?.fullName ??
    option?.label ??
    option?.optionLabel ??
    "Candidate"
  );
}

function partyLabel(option: any) {
  const abbreviation = String(
    option?.abbreviation ?? option?.partyAbbreviation ?? "",
  ).trim();

  return abbreviation || "Independent";
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }

  return value.toLocaleString();
}

function formatFileSize(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "";
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function findLabel(options: SelectOption[], value: string) {
  return options.find((option) => option.value === value)?.label ?? "—";
}

// ============================================================================
// PAGE
// ============================================================================

export default function SubmissionFormPage({ mode, submissionId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { electionId } = useParams();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const normalizedSubmissionId = String(submissionId ?? "").trim();

  const hasSubmissionId = Boolean(normalizedSubmissionId);

  // A submission ID is authoritative. Once a DRAFT has been created, this
  // form must never enter the create flow again for that record.
  const isCreate = mode === "create" && !hasSubmissionId;

  // ==========================================================================
  // AUTH
  // ==========================================================================

  const user = useAuthStore((state: any) => state.user);

  const currentOrgId = useAuthStore((state: any) => state.currentOrgId);

  const orgId = currentOrgId ?? "";

  // ==========================================================================
  // CURRENT USER
  // ==========================================================================

  const meQ = useQuery({
    enabled: Boolean(orgId),

    queryKey: ["users", "me", "submission-form", orgId],

    queryFn: () => fetchMe(orgId),

    staleTime: 60_000,
  });

  const actor = meQ.data ?? user;

  const actorUserId = String((actor as any)?.userId ?? "");

  // ==========================================================================
  // EXISTING SUBMISSION
  // ==========================================================================

  const submissionQ = useQuery({
    enabled: !isCreate && Boolean(submissionId),

    queryKey: ["vote-submission", "edit", submissionId],

    queryFn: () => getSubmission(normalizedSubmissionId),

    staleTime: 0,
  });

  const existing: any = submissionQ.data;

  const existingStatus = String(existing?.status ?? "").toUpperCase();

  const isExistingDraft = hasSubmissionId && existingStatus === "DRAFT";

  const isDraftForm = isCreate || isExistingDraft;

  const existingEvidence =
    Boolean(existing?.hasTallySheet) ||
    Number(existing?.tallySheetCount ?? 0) > 0 ||
    Boolean(String(existing?.tallySheetUrl ?? "").trim());

  // ==========================================================================
  // LOOKUPS
  // ==========================================================================

  const countiesQ = useQuery({
    queryKey: ["counties", "submission-form"],

    queryFn: async () =>
      (
        await fetchCounties({
          page: 0,
          size: 500,
        })
      ).items,

    staleTime: 60_000,
  });

  const contestsQ = useQuery({
    enabled: Boolean(electionId),

    queryKey: ["contests", "submission-form", electionId],

    queryFn: () => listContestsByElection(String(electionId)),

    staleTime: 60_000,
  });

  // ==========================================================================
  // FORM STATE
  // ==========================================================================

  const [countyId, setCountyId] = useState("");

  const [districtId, setDistrictId] = useState("");

  const [centerId, setCenterId] = useState("");

  const [placeId, setPlaceId] = useState("");

  const [contestId, setContestId] = useState("");

  const [contextExpanded, setContextExpanded] = useState(true);

  const [candidateVotes, setCandidateVotes] = useState<Record<string, number>>(
    {},
  );

  const [ballotsReceived, setBallotsReceived] = useState<number | "">("");

  const [invalidBallots, setInvalidBallots] = useState<number | "">("");

  const [rejectedBallots, setRejectedBallots] = useState<number | "">("");

  const [unmarkedBallots, setUnmarkedBallots] = useState<number | "">("");

  const [spoiledBallots, setSpoiledBallots] = useState<number | "">("");

  const [unusedBallots, setUnusedBallots] = useState<number | "">("");

  const [comments, setComments] = useState("");

  const [latitude, setLatitude] = useState<number | "">("");

  const [longitude, setLongitude] = useState<number | "">("");

  const [files, setFiles] = useState<File[]>([]);

  // ==========================================================================
  // CASCADING LOOKUPS
  // ==========================================================================

  const districtsQ = useQuery({
    enabled: isDraftForm && Boolean(countyId),

    queryKey: ["districts", "submission-form", countyId],

    queryFn: () => fetchDistrictsByCounty(countyId),

    staleTime: 60_000,
  });

  const centersQ = useQuery({
    enabled:
      isDraftForm && (isExistingDraft || Boolean(countyId || districtId)),

    queryKey: ["centers", "submission-form", countyId, districtId],

    queryFn: async () =>
      (
        await fetchPollingCenters({
          page: 0,
          size: 500,

          countyId: countyId || undefined,

          districtId: districtId || undefined,
        })
      ).items,

    staleTime: 60_000,
  });

  const placesQ = useQuery({
    enabled: isDraftForm && Boolean(centerId),

    queryKey: ["places", "submission-form", centerId],

    queryFn: async () =>
      (
        await fetchPollingPlaces({
          page: 0,
          size: 2000,
          centerId,
        })
      ).items,

    staleTime: 60_000,
  });

  const optionsQ = useQuery({
    enabled: Boolean(contestId),

    queryKey: ["contest-options", "submission-form", contestId],

    queryFn: () =>
      listOptionsByContest({
        contestId,
        onlyActive: true,
      }) as any,

    staleTime: 60_000,
  });

  // ==========================================================================
  // LOOKUP OPTIONS
  // ==========================================================================

  const countyOptions = useMemo<SelectOption[]>(
    () =>
      (countiesQ.data ?? []).map((item: any) => ({
        value: String(item.countyId),

        label: String(item.countyName ?? "County"),
      })),

    [countiesQ.data],
  );

  const districtOptions = useMemo<SelectOption[]>(
    () =>
      (districtsQ.data ?? []).map((item: any) => ({
        value: String(item.districtId),

        label: String(item.districtName ?? "District"),
      })),

    [districtsQ.data],
  );

  const centerOptions = useMemo<SelectOption[]>(
    () =>
      (centersQ.data ?? []).map((item: any) => ({
        value: String(item.centerId),

        label: String(item.centerName ?? "Polling Center"),
      })),

    [centersQ.data],
  );

  const placeOptions = useMemo<SelectOption[]>(
    () =>
      (placesQ.data ?? []).map((item: any) => ({
        value: String(item.placeId),

        label: String(
          item.placeLabel ??
            (item.placeNumber != null
              ? `Place ${item.placeNumber}`
              : (item.code ?? "Polling Place")),
        ),
      })),

    [placesQ.data],
  );

  const contestOptions = useMemo<SelectOption[]>(
    () =>
      (contestsQ.data ?? []).map((item: any) => ({
        value: String(item.contestId),

        label: String(item.contestName ?? "Contest"),
      })),

    [contestsQ.data],
  );

  // ==========================================================================
  // CANDIDATES
  // ==========================================================================

  const candidateOptions = useMemo(
    () =>
      (optionsQ.data ?? [])
        .filter(
          (option: any) =>
            String(option?.optionType ?? "").toUpperCase() === "CANDIDATE",
        )
        .sort(
          (first: any, second: any) =>
            (first.optionOrder ?? 0) - (second.optionOrder ?? 0),
        ),

    [optionsQ.data],
  );

  // ==========================================================================
  // CONTEXT READINESS
  // ==========================================================================

  const contextReady = Boolean(
    countyId && districtId && centerId && placeId && contestId,
  );

  // ==========================================================================
  // CASCADE RESET
  // ==========================================================================

  useEffect(() => {
    if (!isCreate) {
      return;
    }

    setDistrictId("");
    setCenterId("");
    setPlaceId("");
    setContextExpanded(true);
  }, [countyId, isCreate]);

  useEffect(() => {
    if (!isCreate) {
      return;
    }

    setCenterId("");
    setPlaceId("");
    setContextExpanded(true);
  }, [districtId, isCreate]);

  useEffect(() => {
    if (!isCreate) {
      return;
    }

    setPlaceId("");
    setContextExpanded(true);
  }, [centerId, isCreate]);

  // ==========================================================================
  // ALLOCATION
  // ==========================================================================

  const allocationQ = useQuery({
    enabled: isDraftForm && Boolean(electionId && placeId),

    queryKey: ["place-allocation", electionId, placeId],

    queryFn: async () => {
      const page = await searchPlaceAllocations({
        electionId: String(electionId),

        placeId,

        page: 0,

        size: 1,
      });

      return page.items?.[0] ?? null;
    },

    staleTime: 30_000,
  });

  const expectedRegistered = Number(
    (allocationQ.data as any)?.registeredVoters,
  );

  const expectedIssued = Number((allocationQ.data as any)?.ballotsIssued);

  // ==========================================================================
  // HYDRATE EDIT / DRAFT
  // ==========================================================================

  useEffect(() => {
    if (isCreate || !existing) {
      return;
    }

    setCountyId(String(existing.countyId ?? ""));

    setDistrictId(String(existing.districtId ?? ""));

    setCenterId(String(existing.centerId ?? ""));

    setPlaceId(String(existing.placeId ?? ""));

    setContestId(String(existing.contestId ?? ""));

    setCandidateVotes(existing.candidateVotes ?? {});

    setBallotsReceived(existing.ballotsReceived ?? "");

    setInvalidBallots(existing.invalidBallots ?? "");

    setRejectedBallots(existing.rejectedBallots ?? "");

    setUnmarkedBallots(existing.unmarkedBallots ?? "");

    setSpoiledBallots(existing.spoiledBallots ?? "");

    setUnusedBallots(existing.unusedBallots ?? "");

    setComments(existing.comments ?? "");

    setLatitude(existing.latitude ?? "");

    setLongitude(existing.longitude ?? "");
  }, [isCreate, existing]);

  // --------------------------------------------------------------------------
  // RESTORE COUNTY FOR SAVED DRAFT
  //
  // VoteSubmissionDto may not carry countyId, so resolve it from countyName
  // when necessary.
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!isExistingDraft || countyId || !existing || !countiesQ.data) {
      return;
    }

    const countyName = String(existing.countyName ?? "")
      .trim()
      .toLowerCase();

    if (!countyName) {
      return;
    }

    const county = (countiesQ.data as any[]).find(
      (item: any) =>
        String(item?.countyName ?? "")
          .trim()
          .toLowerCase() === countyName,
    );

    if (county?.countyId) {
      setCountyId(String(county.countyId));
    }
  }, [isExistingDraft, countyId, existing, countiesQ.data]);

  // --------------------------------------------------------------------------
  // RESTORE DISTRICT FOR SAVED DRAFT
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!isExistingDraft || districtId || !existing || !districtsQ.data) {
      return;
    }

    const districtName = String(existing.districtName ?? "")
      .trim()
      .toLowerCase();

    if (!districtName) {
      return;
    }

    const district = (districtsQ.data as any[]).find(
      (item: any) =>
        String(item?.districtName ?? "")
          .trim()
          .toLowerCase() === districtName,
    );

    if (district?.districtId) {
      setDistrictId(String(district.districtId));
    }
  }, [isExistingDraft, districtId, existing, districtsQ.data]);

  // --------------------------------------------------------------------------
  // RESTORE CENTER FOR SAVED DRAFT
  //
  // centerId is normally present. The name fallback protects older records.
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!isExistingDraft || centerId || !existing || !centersQ.data) {
      return;
    }

    const centerName = String(existing.centerName ?? "")
      .trim()
      .toLowerCase();

    if (!centerName) {
      return;
    }

    const center = (centersQ.data as any[]).find(
      (item: any) =>
        String(item?.centerName ?? "")
          .trim()
          .toLowerCase() === centerName,
    );

    if (center?.centerId) {
      setCenterId(String(center.centerId));
    }
  }, [isExistingDraft, centerId, existing, centersQ.data]);

  // --------------------------------------------------------------------------
  // RESTORE PLACE FOR SAVED DRAFT
  //
  // Some submission DTOs expose placeCode/placeNumber/placeLabel instead of
  // placeId. Resolve the actual placeId from the polling-center places.
  // --------------------------------------------------------------------------

  useEffect(() => {
    if (!isExistingDraft || placeId || !existing || !placesQ.data) {
      return;
    }

    const existingPlaceCode = String(existing.placeCode ?? "")
      .trim()
      .toLowerCase();

    const existingPlaceLabel = String(existing.placeLabel ?? "")
      .trim()
      .toLowerCase();

    const existingPlaceNumber =
      existing.placeNumber == null ? null : Number(existing.placeNumber);

    const place = (placesQ.data as any[]).find((item: any) => {
      const itemCode = String(item?.placeCode ?? item?.code ?? "")
        .trim()
        .toLowerCase();

      const itemLabel = String(
        item?.placeLabel ??
          (item?.placeNumber != null ? `Place ${item.placeNumber}` : ""),
      )
        .trim()
        .toLowerCase();

      const itemNumber =
        item?.placeNumber == null ? null : Number(item.placeNumber);

      const codeMatches =
        Boolean(existingPlaceCode) && itemCode === existingPlaceCode;

      const labelMatches =
        Boolean(existingPlaceLabel) && itemLabel === existingPlaceLabel;

      const numberMatches =
        existingPlaceNumber !== null &&
        itemNumber !== null &&
        itemNumber === existingPlaceNumber;

      return codeMatches || labelMatches || numberMatches;
    });

    if (place?.placeId) {
      setPlaceId(String(place.placeId));
    }
  }, [isExistingDraft, placeId, existing, placesQ.data]);

  // ==========================================================================
  // GPS
  // ==========================================================================

  useEffect(() => {
    if (!isCreate || !("geolocation" in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);

        setLongitude(position.coords.longitude);
      },

      () => {
        // GPS must never block vote entry.
      },

      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 30_000,
      },
    );
  }, [isCreate]);

  const gpsCaptured = latitude !== "" && longitude !== "";

  // ==========================================================================
  // RECONCILIATION
  // ==========================================================================

  const valid = useMemo(
    () => sumVotes(candidateVotes),

    [candidateVotes],
  );

  /**
   * Invalid votes physically inside the ballot box.
   *
   * Spoiled ballots are outside the box.
   */
  const invalid =
    (Number(invalidBallots) || 0) +
    (Number(rejectedBallots) || 0) +
    (Number(unmarkedBallots) || 0);

  const ballotsInBox = valid + invalid;

  /**
   * Ballots outside the box.
   */
  const outsideBox =
    (Number(spoiledBallots) || 0) + (Number(unusedBallots) || 0);

  const exceedsIssued =
    Number.isFinite(expectedIssued) &&
    expectedIssued > 0 &&
    ballotsInBox > expectedIssued;

  const exceedsRegistered =
    Number.isFinite(expectedRegistered) &&
    expectedRegistered > 0 &&
    ballotsInBox > expectedRegistered;

  const expectedInBox =
    ballotsReceived === "" ? null : Number(ballotsReceived) - outsideBox;

  const ballotDelta =
    expectedInBox === null ? null : ballotsInBox - expectedInBox;

  // ==========================================================================
  // REQUIRED NOTES
  // ==========================================================================

  const notesReady = comments.trim().length > 0;

  // ==========================================================================
  // REQUEST BUILDERS
  // ==========================================================================

  const buildCreateRequest = (draft: boolean): VoteSubmissionCreateRequest =>
    ({
      orgId,

      electionId: String(electionId),

      centerId,

      placeId,

      contestId,

      agentId: actorUserId,

      candidateVotes,

      ballotsReceived:
        ballotsReceived === "" ? undefined : Number(ballotsReceived),

      ballotsInBox,

      invalidBallots:
        invalidBallots === "" ? undefined : Number(invalidBallots),

      rejectedBallots:
        rejectedBallots === "" ? undefined : Number(rejectedBallots),

      unmarkedBallots:
        unmarkedBallots === "" ? undefined : Number(unmarkedBallots),

      spoiledBallots:
        spoiledBallots === "" ? undefined : Number(spoiledBallots),

      unusedBallots: unusedBallots === "" ? undefined : Number(unusedBallots),

      comments: comments.trim(),

      latitude: latitude === "" ? undefined : Number(latitude),

      longitude: longitude === "" ? undefined : Number(longitude),

      idempotencyKey: `${actorUserId}-${Date.now()}`,

      draft: draft ? true : undefined,
    }) as any;

  const buildUpdateRequest = (): VoteSubmissionUpdateRequest =>
    ({
      candidateVotes,

      ballotsReceived:
        ballotsReceived === "" ? undefined : Number(ballotsReceived),

      ballotsInBox,

      invalidBallots: Number(invalidBallots) || 0,

      rejectedBallots: Number(rejectedBallots) || 0,

      unmarkedBallots: Number(unmarkedBallots) || 0,

      spoiledBallots: Number(spoiledBallots) || 0,

      unusedBallots: Number(unusedBallots) || 0,

      comments: comments.trim(),

      latitude: latitude === "" ? undefined : Number(latitude),

      longitude: longitude === "" ? undefined : Number(longitude),
    }) as any;

  // ==========================================================================
  // MUTATIONS
  // ==========================================================================

  type CreateMutationInput = {
    request: VoteSubmissionCreateRequest;
    draft: boolean;
  };

  const createM = useMutation({
    mutationFn: ({ request }: CreateMutationInput) => {
      if (hasSubmissionId) {
        throw new Error(
          "This submission already exists. Existing drafts must be updated, not created again.",
        );
      }

      return createSubmissionMultipart({
        payload: request,

        files,
      });
    },

    onSuccess: async (created: any, variables: CreateMutationInput) => {
      await queryClient.invalidateQueries({
        queryKey: ["vote-submissions"],
      });

      const createdId = String(created?.submissionId ?? created?.id ?? "");

      if (!createdId) {
        throw new Error(
          "The submission was saved, but no submission ID was returned.",
        );
      }

      if (variables.draft) {
        navigate(`/elections/${electionId}/submissions/${createdId}/edit`, {
          replace: true,
        });

        return;
      }

      navigate(`/elections/${electionId}/submissions/${createdId}`);
    },
  });

  const updateM = useMutation({
    mutationFn: async (request: VoteSubmissionUpdateRequest) => {
      if (!submissionId) {
        throw new Error("The vote submission ID is missing.");
      }

      if (files.length > 0) {
        return updateSubmissionMultipart({
          id: normalizedSubmissionId,

          payload: request,

          files,
        });
      }

      return updateSubmissionJson(
        normalizedSubmissionId,

        request,
      );
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vote-submission"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vote-submissions"],
      });

      setFiles([]);

      if (isExistingDraft) {
        await queryClient.invalidateQueries({
          queryKey: ["vote-submission", "edit", submissionId],
        });

        return;
      }

      navigate(`/elections/${electionId}/submissions/${submissionId}`);
    },
  });

  const submitDraftM = useMutation({
    mutationFn: async () => {
      if (!submissionId) {
        throw new Error("The vote submission ID is missing.");
      }

      const request = buildUpdateRequest();

      if (files.length > 0) {
        await updateSubmissionMultipart({
          id: normalizedSubmissionId,

          payload: request,

          files,
        });
      } else {
        await updateSubmissionJson(
          normalizedSubmissionId,

          request,
        );
      }

      return submitDraft(normalizedSubmissionId);
    },

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["vote-submission"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["vote-submissions"],
      });

      navigate(`/elections/${electionId}/submissions/${submissionId}`);
    },
  });

  const busy = createM.isPending || updateM.isPending || submitDraftM.isPending;

  // ==========================================================================
  // READINESS
  // ==========================================================================

  const locationReady = isDraftForm
    ? Boolean(orgId && electionId && centerId && placeId && contestId)
    : Boolean(submissionId);

  const ballotsReceivedReady = ballotsReceived !== "";

  const reconcileReady = !exceedsIssued && !exceedsRegistered;

  const evidenceReady = files.length > 0 || existingEvidence;

  /**
   * Draft saves require enough context to reopen the record safely.
   */
  const canDraft = locationReady && ballotsReceivedReady && notesReady && !busy;

  /**
   * Final submission requires a reconciled tally, evidence, and at least
   * one ballot in the box.
   */
  const canSubmit =
    locationReady &&
    ballotsReceivedReady &&
    notesReady &&
    reconcileReady &&
    evidenceReady &&
    ballotsInBox > 0 &&
    !busy;

  // ==========================================================================
  // FILE ATTACHMENTS
  // ==========================================================================

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function addFiles(selected: FileList | null) {
    if (!selected || selected.length === 0) {
      return;
    }

    const incoming = Array.from(selected);

    setFiles((current) => {
      const combined = [...current];

      for (const file of incoming) {
        const duplicate = combined.some(
          (existingFile) =>
            existingFile.name === file.name &&
            existingFile.size === file.size &&
            existingFile.lastModified === file.lastModified,
        );

        if (!duplicate) {
          combined.push(file);
        }
      }

      return combined;
    });
  }

  function removeFile(index: number) {
    setFiles((current) =>
      current.filter((_, currentIndex) => currentIndex !== index),
    );
  }

  // ==========================================================================
  // CONTEXT HANDLERS
  // ==========================================================================

  function handlePlaceChange(value: string) {
    setPlaceId(value);

    if (value && contestId) {
      setContextExpanded(false);
    }
  }

  function handleContestChange(value: string) {
    setContestId(value);

    setCandidateVotes({});

    if (value && placeId) {
      setContextExpanded(false);
    }
  }

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function goBack() {
    navigate(
      isCreate || isExistingDraft
        ? `/elections/${electionId}/submissions`
        : `/elections/${electionId}/submissions/${submissionId}`,
    );
  }

  // ==========================================================================
  // LOADING
  // ==========================================================================

  if (!isCreate && submissionQ.isLoading) {
    return (
      <div className="app-form py-16 text-center">
        <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />

        <div className="mt-3 text-sm font-semibold text-slate-500">
          Loading submission...
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="app-form">
      <Panel
        title={
          isCreate
            ? "New Vote Submission"
            : isExistingDraft
              ? "Draft Vote Submission"
              : "Edit Vote Submission"
        }
      >
        <div className="flex flex-col gap-2 pb-16">
          {/* ================================================================= */}
          {/* BACK */}
          {/* ================================================================= */}

          <button
            type="button"
            onClick={goBack}
            className="inline-flex h-9 w-fit items-center justify-center gap-1.5 rounded-md bg-[#00095f] px-3 text-xs 
                      font-bold leading-none  text-white hover:bg-[#000b73]  hover:text-[#cb3242]"
          >
            <ArrowLeft size={14} className="shrink-0" />
            <span>Back</span>
          </button>

          {/* ================================================================= */}
          {/* SUBMISSION CONTEXT */}
          {/* ================================================================= */}

          <Section
            title="Submission Context"
            icon={<MapPin size={15} />}
            right={
              isDraftForm && contextReady ? (
                <button
                  type="button"
                  onClick={() => setContextExpanded((current) => !current)}
                  className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-[10px] font-bold text-slate-600 hover:bg-slate-50"
                >
                  {contextExpanded ? (
                    <>
                      Done
                      <ChevronDown size={12} className="rotate-180" />
                    </>
                  ) : (
                    <>
                      <Pencil size={11} />
                      Edit
                    </>
                  )}
                </button>
              ) : null
            }
          >
            {isDraftForm ? (
              <>
                {!contextExpanded && contextReady ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                      <ContextSummary
                        label="County"
                        value={findLabel(countyOptions, countyId)}
                      />

                      <ContextSummary
                        label="District"
                        value={findLabel(districtOptions, districtId)}
                      />

                      <ContextSummary
                        label="Center"
                        value={findLabel(centerOptions, centerId)}
                        className="col-span-2"
                      />

                      <ContextSummary
                        label="Place"
                        value={findLabel(placeOptions, placeId)}
                      />

                      <ContextSummary
                        label="Contest"
                        value={findLabel(contestOptions, contestId)}
                      />
                    </div>

                    <AllocationSummary
                      loading={allocationQ.isLoading}
                      found={Boolean(allocationQ.data)}
                      registered={expectedRegistered}
                      issued={expectedIssued}
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-2 lg:grid-cols-5">
                      <SelectField
                        label="County"
                        value={countyId}
                        onChange={setCountyId}
                        disabled={!isCreate}
                        options={countyOptions}
                      />

                      <SelectField
                        label="District"
                        value={districtId}
                        onChange={setDistrictId}
                        disabled={!isCreate || !countyId}
                        options={districtOptions}
                      />

                      <SelectField
                        label="Polling Center"
                        value={centerId}
                        onChange={setCenterId}
                        disabled={!isCreate || !countyId}
                        wrapperClassName="col-span-2 lg:col-span-1"
                        options={centerOptions}
                      />

                      <SelectField
                        label="Polling Place"
                        value={placeId}
                        onChange={handlePlaceChange}
                        disabled={!isCreate || !centerId}
                        options={placeOptions}
                      />

                      <SelectField
                        label="Contest"
                        value={contestId}
                        onChange={handleContestChange}
                        disabled={!isCreate}
                        options={contestOptions}
                      />
                    </div>

                    {placeId ? (
                      <AllocationSummary
                        loading={allocationQ.isLoading}
                        found={Boolean(allocationQ.data)}
                        registered={expectedRegistered}
                        issued={expectedIssued}
                      />
                    ) : null}
                  </>
                )}
              </>
            ) : (
              <div className="divide-y divide-slate-100">
                <CompactRead label="County" value={existing?.countyName} />

                <CompactRead label="District" value={existing?.districtName} />

                <CompactRead label="Center" value={existing?.centerName} />

                <CompactRead label="Place" value={existing?.placeLabel} />

                <CompactRead label="Contest" value={existing?.contestName} />
              </div>
            )}
          </Section>

          {/* ================================================================= */}
          {/* MAIN ENTRY */}
          {/* ================================================================= */}

          <div className="grid gap-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(310px,.6fr)] xl:gap-3">
            {/* =============================================================== */}
            {/* CANDIDATE RESULTS */}
            {/* =============================================================== */}

            <Section
              title="Candidate Results"
              icon={<Vote size={15} />}
              right={
                <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-500">
                  {candidateOptions.length > 0 ? (
                    <span className="hidden sm:inline">
                      {candidateOptions.length} candidates
                    </span>
                  ) : null}

                  <span>
                    Valid:{" "}
                    <strong className="text-blue-700">
                      {valid.toLocaleString()}
                    </strong>
                  </span>
                </div>
              }
            >
              {!contestId ? (
                <div className="py-4 text-center text-xs font-semibold text-slate-400">
                  Select a contest to enter candidate votes.
                </div>
              ) : optionsQ.isLoading ? (
                <div className="py-4 text-center text-xs font-semibold text-slate-400">
                  Loading candidates...
                </div>
              ) : candidateOptions.length === 0 ? (
                <div className="py-4 text-center text-xs font-semibold text-slate-400">
                  No active candidates found.
                </div>
              ) : (
                <div className="max-h-[52vh] overflow-y-auto overscroll-contain border-y border-slate-100 sm:max-h-none sm:overflow-visible">
                  {candidateOptions.map((option: any, index: number) => {
                    const voteKey = String(
                      option.electId ??
                        option.optionId ??
                        option.id ??
                        option.key,
                    );

                    return (
                      <label
                        key={voteKey}
                        className="grid min-h-11 grid-cols-[24px_minmax(0,1fr)_72px] items-center gap-2 border-b border-slate-100 py-1 last:border-b-0 sm:grid-cols-[30px_minmax(0,1fr)_86px]"
                      >
                        <span className="text-center text-[10px] font-bold text-slate-400">
                          {index + 1}
                        </span>

                        <div className="min-w-0 truncate text-[13px] font-bold text-slate-900 sm:text-sm">
                          {candidateLabel(option)}

                          <span className="font-semibold text-slate-500">
                            {" - "}
                            {partyLabel(option)}
                          </span>
                        </div>

                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={candidateVotes[voteKey] ?? 0}
                          onFocus={(event) => event.currentTarget.select()}
                          onChange={(event) =>
                            setCandidateVotes((current) => ({
                              ...current,

                              [voteKey]: clamp(event.target.value),
                            }))
                          }
                          className="h-9 w-full rounded-lg border border-slate-300 bg-white px-2 text-right text-base font-extrabold text-blue-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-10"
                        />
                      </label>
                    );
                  })}
                </div>
              )}
            </Section>

            {/* =============================================================== */}
            {/* BALLOT RECONCILIATION */}
            {/* =============================================================== */}

            <Section
              title="Ballot Reconciliation"
              icon={<FileText size={15} />}
            >
              <div className="grid grid-cols-3 gap-x-2 gap-y-2">
                <CompactNumberField
                  label="Received"
                  value={ballotsReceived}
                  onChange={setBallotsReceived}
                  required
                />

                <CompactNumberField
                  label="Invalid"
                  value={invalidBallots}
                  onChange={setInvalidBallots}
                />

                <CompactNumberField
                  label="Rejected"
                  value={rejectedBallots}
                  onChange={setRejectedBallots}
                />

                <CompactNumberField
                  label="Unmarked"
                  value={unmarkedBallots}
                  onChange={setUnmarkedBallots}
                />

                <CompactNumberField
                  label="Spoiled"
                  hint="Out"
                  value={spoiledBallots}
                  onChange={setSpoiledBallots}
                />

                <CompactNumberField
                  label="Unused"
                  hint="Out"
                  value={unusedBallots}
                  onChange={setUnusedBallots}
                />
              </div>

              <div className="mt-3 grid grid-cols-3 border-y border-slate-200 py-2">
                <ResultValue
                  label="Valid"
                  value={valid.toLocaleString()}
                  emphasis
                />

                <ResultValue
                  label="In Box"
                  value={ballotsInBox.toLocaleString()}
                  emphasis
                />

                <ResultValue
                  label="Outside"
                  value={outsideBox.toLocaleString()}
                />
              </div>

              {ballotsReceived !== "" ? (
                <div className="mt-2 grid grid-cols-2 gap-x-5 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Expected</span>

                    <strong className="text-slate-800">
                      {formatNumber(expectedInBox)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Delta</span>

                    <strong
                      className={
                        ballotDelta === 0 ? "text-emerald-700" : "text-red-700"
                      }
                    >
                      {ballotDelta === null
                        ? "—"
                        : ballotDelta > 0
                          ? `+${ballotDelta}`
                          : ballotDelta}
                    </strong>
                  </div>
                </div>
              ) : null}

              {exceedsIssued || exceedsRegistered ? (
                <div className="mt-2 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] font-bold text-red-700">
                  <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                  Ballots in box exceed the registered-voter or issued-ballot
                  limit.
                </div>
              ) : null}
            </Section>
          </div>

          {/* ================================================================= */}
          {/* EVIDENCE + SUBMISSION NOTES */}
          {/* ================================================================= */}

          <div className="grid items-start gap-2 lg:grid-cols-2 lg:gap-3">
            {/* ================================================================= */}
            {/* EVIDENCE */}
            {/* ================================================================= */}

            <Section
              title="Evidence"
              icon={<UploadCloud size={15} />}
              right={
                files.length > 0 ? (
                  <span className="text-[10px] font-bold text-emerald-700">
                    {files.length} new attached
                  </span>
                ) : existingEvidence ? (
                  <span className="text-[10px] font-bold text-emerald-700">
                    Existing evidence attached
                  </span>
                ) : null
              }
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(event) => {
                  addFiles(event.target.files);

                  event.currentTarget.value = "";
                }}
                className="hidden"
              />

              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed border-slate-300 px-2.5 py-2.5">
                <div className="flex min-w-0 items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Paperclip size={17} />
                  </div>

                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-slate-800 sm:text-sm">
                      Tally sheet / supporting evidence
                    </div>

                    <div className="hidden text-[10px] text-slate-500 sm:block">
                      One or more attachments
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={openFilePicker}
                  className="min-h-9 shrink-0 rounded-lg bg-blue-700 px-3 text-xs font-bold text-white hover:bg-blue-800"
                >
                  Choose Files
                </button>
              </div>

              {files.length > 0 ? (
                <div className="mt-2 max-h-40 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                      className="flex items-center justify-between gap-2 px-2.5 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-xs font-bold text-slate-700">
                          {file.name}
                        </div>

                        <div className="mt-0.5 truncate text-[9px] text-slate-400">
                          {file.type || "Attachment"}

                          {file.size ? ` • ${formatFileSize(file.size)}` : ""}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="inline-flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${file.name}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : existingEvidence ? (
                <div className="mt-1.5 text-[10px] font-semibold text-emerald-700">
                  Existing evidence will be retained with this submission.
                </div>
              ) : (
                <div className="mt-1.5 text-[10px] font-semibold text-amber-700">
                  Evidence is required before final submission.
                </div>
              )}
            </Section>

            {/* ================================================================= */}
            {/* SUBMISSION NOTES — ALWAYS VISIBLE */}
            {/* ================================================================= */}

            <Section
              title="Submission Notes"
              icon={<FileText size={15} />}
              right={
                <span
                  className={[
                    "inline-flex items-center gap-1 text-[10px] font-semibold",

                    gpsCaptured ? "text-emerald-700" : "text-slate-400",
                  ].join(" ")}
                >
                  <Navigation size={11} />

                  {gpsCaptured ? "GPS captured" : "GPS unavailable"}
                </span>
              }
            >
              <label className="block">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Field Agent Notes
                    <span className="text-red-600"> *</span>
                  </span>

                  <span
                    className={[
                      "text-[9px] font-semibold",

                      notesReady ? "text-emerald-600" : "text-amber-600",
                    ].join(" ")}
                  >
                    {notesReady ? "Provided" : "Required"}
                  </span>
                </div>

                <textarea
                  value={comments}
                  onChange={(event) => setComments(event.target.value)}
                  rows={3}
                  required
                  placeholder="Enter observations, reconciliation details, incidents, or other field feedback..."
                  className={[
                    "w-full resize-y rounded-lg border px-3 py-2 text-sm leading-5 outline-none focus:ring-2",

                    notesReady
                      ? "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                      : "border-amber-300 focus:border-amber-500 focus:ring-amber-100",
                  ].join(" ")}
                />
              </label>

              {!notesReady ? (
                <div className="mt-1 text-[10px] font-semibold text-amber-700">
                  Submission notes are required before saving or submitting.
                </div>
              ) : null}

              <div className="mt-2 hidden grid-cols-2 gap-3 border-t border-slate-200 pt-2 text-xs sm:grid">
                <InlineValue
                  label="Latitude"
                  value={latitude === "" ? "—" : String(latitude)}
                />

                <InlineValue
                  label="Longitude"
                  value={longitude === "" ? "—" : String(longitude)}
                />
              </div>
            </Section>
          </div>

          {/* ================================================================= */}
          {/* ERROR */}
          {/* ================================================================= */}

          {createM.isError || updateM.isError || submitDraftM.isError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />

              {errorText(createM.error ?? updateM.error ?? submitDraftM.error)}
            </div>
          ) : null}
        </div>

        {/* =================================================================== */}
        {/* STICKY ACTION BAR */}
        {/* =================================================================== */}

        <section className="sticky bottom-0 z-20 mt-2 grid grid-cols-[.8fr_.9fr_1.3fr] gap-2 border-t border-slate-200 bg-white/95 px-1 py-2.5 shadow-[0_-5px_18px_rgba(15,23,42,0.06)] backdrop-blur sm:flex sm:justify-end sm:px-3">
          <button
            type="button"
            disabled={busy}
            onClick={goBack}
            className="min-h-11 rounded-lg border border-slate-300 px-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 sm:px-4"
          >
            Cancel
          </button>

          {isCreate ? (
            <>
              <button
                type="button"
                disabled={!canDraft}
                onClick={() =>
                  createM.mutate({
                    request: buildCreateRequest(true),
                    draft: true,
                  })
                }
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
              >
                <Save size={14} />

                {createM.isPending ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() =>
                  createM.mutate({
                    request: buildCreateRequest(false),
                    draft: false,
                  })
                }
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-2 text-sm font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-5"
              >
                <Send size={14} />

                {createM.isPending ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          ) : isExistingDraft ? (
            <>
              <button
                type="button"
                disabled={!canDraft}
                onClick={() => updateM.mutate(buildUpdateRequest())}
                className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-slate-300 px-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
              >
                <Save size={14} />

                {updateM.isPending ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                disabled={!canSubmit}
                onClick={() => submitDraftM.mutate()}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-2 text-sm font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-5"
              >
                <Send size={14} />

                {submitDraftM.isPending ? "Submitting..." : "Submit for Review"}
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={busy || !submissionId || !reconcileReady || !notesReady}
              onClick={() => updateM.mutate(buildUpdateRequest())}
              className="col-span-2 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-blue-700 px-3 text-sm font-extrabold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400 sm:px-5"
            >
              <Save size={14} />

              {updateM.isPending ? "Saving..." : "Save Changes"}
            </button>
          )}
        </section>
      </Panel>
    </div>
  );
}

// ============================================================================
// SECTION
// ============================================================================

function Section({
  title,
  icon,
  right,
  children,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-200 bg-white sm:overflow-hidden sm:rounded-xl sm:border">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-2 sm:bg-slate-50 sm:px-3">
        <div className="flex min-w-0 items-center gap-1.5 text-sm font-bold text-slate-800">
          {icon ? <span className="shrink-0 text-blue-600">{icon}</span> : null}

          <span className="truncate">{title}</span>
        </div>

        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="py-2 sm:p-3">{children}</div>
    </section>
  );
}

// ============================================================================
// SELECT FIELD
// ============================================================================

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  wrapperClassName = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  wrapperClassName?: string;
}) {
  return (
    <label className={["min-w-0", wrapperClassName].join(" ")}>
      <span className="mb-0.5 block truncate text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400 sm:h-11"
      >
        <option value="">Select</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

// ============================================================================
// COMPACT NUMBER FIELD
// ============================================================================

function CompactNumberField({
  label,
  hint,
  value,
  onChange,
  required,
}: {
  label: string;
  hint?: string;
  value: number | "";
  onChange: (value: number | "") => void;
  required?: boolean;
}) {
  return (
    <label className="min-w-0">
      <div className="mb-0.5 flex min-h-4 items-center justify-between gap-1">
        <span className="truncate text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[9px]">
          {label}

          {required ? <span className="text-red-600">*</span> : null}
        </span>

        {hint ? (
          <span className="text-[7px] font-bold uppercase text-slate-400">
            {hint}
          </span>
        ) : null}
      </div>

      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) =>
          onChange(event.target.value === "" ? "" : clamp(event.target.value))
        }
        className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2 text-right text-base font-extrabold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:h-11"
      />
    </label>
  );
}

// ============================================================================
// RESULT VALUE
// ============================================================================

function ResultValue({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="min-w-0 text-center">
      <div
        className={[
          "text-[8px] font-bold uppercase tracking-wide",

          emphasis ? "text-blue-500" : "text-slate-400",
        ].join(" ")}
      >
        {label}
      </div>

      <div
        className={[
          "mt-0.5 text-base font-extrabold",

          emphasis ? "text-blue-700" : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// INLINE VALUE
// ============================================================================

function InlineValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      <span className="font-semibold text-slate-500">{label}</span>

      <strong className="font-extrabold text-slate-900">{value}</strong>
    </span>
  );
}

// ============================================================================
// ALLOCATION SUMMARY
// ============================================================================

function AllocationSummary({
  loading,
  found,
  registered,
  issued,
}: {
  loading: boolean;
  found: boolean;
  registered: number;
  issued: number;
}) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-200 pt-2 text-[11px]">
      {loading ? (
        <span className="font-semibold text-slate-400">
          Loading allocation...
        </span>
      ) : found ? (
        <>
          <InlineValue
            label="Registered"
            value={
              Number.isFinite(registered) ? registered.toLocaleString() : "—"
            }
          />

          <InlineValue
            label="Issued"
            value={Number.isFinite(issued) ? issued.toLocaleString() : "—"}
          />

          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
            <CheckCircle2 size={12} />
            Allocation found
          </span>
        </>
      ) : (
        <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
          <AlertTriangle size={12} />
          No allocation found
        </span>
      )}
    </div>
  );
}

// ============================================================================
// CONTEXT SUMMARY
// ============================================================================

function ContextSummary({
  label,
  value,
  className = "",
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={["min-w-0", className].join(" ")}>
      <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-0.5 truncate text-xs font-bold text-slate-800 sm:text-sm">
        {value}
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT READ
// ============================================================================

function CompactRead({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-[85px_minmax(0,1fr)] items-center gap-2 py-2">
      <div className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="min-w-0 truncate text-sm font-bold text-slate-800">
        {value ?? "—"}
      </div>
    </div>
  );
}
