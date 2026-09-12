// src/pages/elections/workspace/tabs/setup/masters/CandidateMasterFormPage.tsx

import { useEffect, useMemo, useState } from "react";

import { useLocation, useNavigate, useParams } from "react-router-dom";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  RefreshCw,
  Save,
  Upload,
  UserRound,
  X,
} from "lucide-react";

import { apiClient } from "../../../../../../shared/lib/apiClient";

import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  createCandidate,
  updateCandidate,
  type CandidateDto,
} from "../../../../../../shared/services/candidateService";

import {
  searchParties,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

import {
  fetchFileBlob,
  findCurrentPhoto,
  listEntityFiles,
  uploadFileMultipart,
} from "../../../../../../shared/services/fileUploadService";

// ============================================================================
// TYPES
// ============================================================================

type MeDto = {
  userId: string;
};

// ============================================================================
// HELPERS
// ============================================================================

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function getActiveValue(candidate: CandidateDto) {
  const raw = candidate as any;

  return Boolean(raw?.isActive ?? raw?.active ?? false);
}

function getIndependentValue(candidate: CandidateDto) {
  const raw = candidate as any;

  return Boolean(raw?.independent ?? raw?.isIndependent ?? false);
}

function getCandidatePartyId(candidate: CandidateDto) {
  const raw = candidate as any;

  return safeStr(raw?.partyId);
}

function friendlySaveError(error: any) {
  const message =
    safeStr(error?.response?.data?.message) ||
    safeStr(error?.response?.data?.error) ||
    safeStr(error?.message) ||
    "Failed to save candidate.";

  if (/duplicate|unique|already exists|constraint/i.test(message)) {
    return "Candidate already exists or conflicts with an existing candidate record.";
  }

  return message;
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function validatePhoto(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.type)) {
    return "Photo must be a JPG, PNG, or WebP image.";
  }

  const maxBytes = 5 * 1024 * 1024;

  if (file.size > maxBytes) {
    return "Photo must be 5 MB or smaller.";
  }

  return null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function CandidateMasterFormPage() {
  const { electionId } = useParams<{
    electionId: string;
  }>();

  const location = useLocation();

  const navigate = useNavigate();

  const queryClient = useQueryClient();

  // ==========================================================================
  // IMPORTANT
  //
  // SetupTab owns /setup/* manually.
  //
  // Because candidateId is not declared as a React Router child-route param,
  // useParams() does NOT reliably expose candidateId here.
  //
  // Therefore Edit mode is determined directly from the current pathname.
  // ==========================================================================

  const candidateId = useMemo(() => {
    const match = location.pathname.match(
      /\/setup\/master-candidates\/([^/]+)\/edit\/?$/,
    );

    if (!match?.[1]) {
      return null;
    }

    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }, [location.pathname]);

  const isEdit = Boolean(candidateId);

  // ==========================================================================
  // ACCESS
  // ==========================================================================

  const dashboardMode = useAuthStore((state) => state.dashboardMode);

  const currentOrgId = useAuthStore((state) => state.currentOrgId);

  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "NEC" || dashboardMode === "SYSTEM" || isSystemAdmin;

  // ==========================================================================
  // CURRENT USER
  // ==========================================================================

  const meQuery = useQuery({
    queryKey: ["me"],

    queryFn: async () => {
      const { data } = await apiClient.get<MeDto>("/users/me");

      return data;
    },

    staleTime: 30_000,

    retry: 1,
  });

  const currentUserId = meQuery.data?.userId ?? null;

  // ==========================================================================
  // FORM STATE
  // ==========================================================================

  const [fullName, setFullName] = useState("");

  const [position, setPosition] = useState("");

  const [partyId, setPartyId] = useState("");

  const [independent, setIndependent] = useState(false);

  const [isActive, setIsActive] = useState(true);

  const [photoFile, setPhotoFile] = useState<File | null>(null);

  const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(
    null,
  );

  const [existingPhotoSrc, setExistingPhotoSrc] = useState<string | null>(null);

  const [photoError, setPhotoError] = useState<string | null>(null);

  const [touched, setTouched] = useState(false);

  // ==========================================================================
  // PARTY LOOKUP
  // ==========================================================================

  const partiesQuery = useQuery({
    queryKey: ["party-master-dropdown"],

    queryFn: () =>
      searchParties({
        page: 0,

        size: 500,

        q: undefined,
      }),

    staleTime: 60_000,

    retry: 1,
  });

  const parties: PartyDto[] = useMemo(
    () => partiesQuery.data?.items ?? [],

    [partiesQuery.data],
  );

  // ==========================================================================
  // LOAD CURRENT CANDIDATE
  //
  // Backend:
  //
  // GET /api/candidates/{candidateId}
  //
  // This makes Edit reliable even after browser refresh.
  // ==========================================================================

  const candidateQuery = useQuery({
    enabled: Boolean(isEdit && candidateId),

    queryKey: ["candidate-master", "detail", candidateId],

    queryFn: async () => {
      const { data } = await apiClient.get<CandidateDto>(
        `/candidates/${encodeURIComponent(candidateId!)}`,
      );

      return data;
    },

    staleTime: 10_000,

    retry: 1,
  });

  const candidate = candidateQuery.data ?? null;

  // ==========================================================================
  // PREFILL EDIT FORM
  // ==========================================================================

  useEffect(() => {
    if (!isEdit || !candidate) {
      return;
    }

    const candidateIndependent = getIndependentValue(candidate);

    setFullName(safeStr(candidate.fullName));

    setPosition(safeStr(candidate.position));

    setIndependent(candidateIndependent);

    setIsActive(getActiveValue(candidate));

    // ======================================================================
    // PARTY
    //
    // Prefer candidate.partyId.
    //
    // If an older DTO does not expose partyId, resolve it from party
    // abbreviation/name using the Party Master lookup.
    // ======================================================================

    if (candidateIndependent) {
      setPartyId("");
    } else {
      const directPartyId = getCandidatePartyId(candidate);

      if (directPartyId) {
        setPartyId(directPartyId);
      } else {
        const candidatePartyName = safeStr((candidate as any)?.partyName)
          .trim()
          .toLowerCase();

        const candidateAbbreviation = safeStr((candidate as any)?.abbreviation)
          .trim()
          .toLowerCase();

        const matchedParty = parties.find((party) => {
          const partyName = safeStr(party.partyName).trim().toLowerCase();

          const abbreviation = safeStr(party.abbreviation).trim().toLowerCase();

          if (candidateAbbreviation && abbreviation === candidateAbbreviation) {
            return true;
          }

          if (candidatePartyName && partyName === candidatePartyName) {
            return true;
          }

          return false;
        });

        setPartyId(matchedParty?.partyId ?? "");
      }
    }

    setTouched(false);
  }, [isEdit, candidate, parties]);

  // ==========================================================================
  // EXISTING FILEUPLOAD PHOTO
  // ==========================================================================

  const filesQuery = useQuery({
    enabled: Boolean(isEdit && candidateId && currentOrgId),

    queryKey: ["file-uploads", "candidate", candidateId, currentOrgId],

    queryFn: () =>
      listEntityFiles({
        orgId: currentOrgId!,

        relatedTable: "candidate",

        relatedId: candidateId!,
      }),

    staleTime: 10_000,

    retry: 1,
  });

  const existingPhoto = useMemo(
    () =>
      findCurrentPhoto(
        filesQuery.data,

        candidate?.photoUrl ?? null,
      ),

    [filesQuery.data, candidate?.photoUrl],
  );

  // ==========================================================================
  // AUTHENTICATED EXISTING PHOTO CONTENT
  // ==========================================================================

  const existingPhotoQuery = useQuery({
    enabled: Boolean(existingPhoto?.fileId),

    queryKey: ["file-content", existingPhoto?.fileId],

    queryFn: () => fetchFileBlob(existingPhoto!.fileId),

    staleTime: 60_000,

    retry: 1,
  });

  useEffect(() => {
    setExistingPhotoSrc(null);

    if (!existingPhotoQuery.data) {
      return;
    }

    const objectUrl = URL.createObjectURL(existingPhotoQuery.data);

    setExistingPhotoSrc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [existingPhotoQuery.data]);

  // ==========================================================================
  // LOCAL PHOTO PREVIEW
  // ==========================================================================

  useEffect(() => {
    if (!photoFile) {
      setLocalPhotoPreview(null);

      return;
    }

    const objectUrl = URL.createObjectURL(photoFile);

    setLocalPhotoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [photoFile]);

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  const normalizedName = useMemo(
    () => normalizeName(fullName),

    [fullName],
  );

  const formValid = Boolean(normalizedName && !photoError);

  // ==========================================================================
  // PHOTO SELECTION
  // ==========================================================================

  const selectPhoto = (file: File | null) => {
    setPhotoError(null);

    if (!file) {
      setPhotoFile(null);

      return;
    }

    const validation = validatePhoto(file);

    if (validation) {
      setPhotoError(validation);

      setPhotoFile(null);

      return;
    }

    setPhotoFile(file);
  };

  // ==========================================================================
  // SAVE / UPDATE
  // ==========================================================================

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formValid) {
        throw new Error("Candidate name is required.");
      }

      if (photoFile && !currentOrgId) {
        throw new Error(
          "An organization must be selected before uploading a candidate photo.",
        );
      }

      if (photoFile && !currentUserId) {
        throw new Error(
          "Unable to determine the current user for the photo upload.",
        );
      }

      let savedCandidate: CandidateDto;

      // ==================================================================
      // UPDATE
      // ==================================================================

      if (isEdit) {
        if (!candidateId) {
          throw new Error("Missing candidate ID.");
        }

        savedCandidate = await updateCandidate(
          candidateId,

          {
            fullName: normalizedName,

            position: position.trim() || null,

            partyId: independent ? null : partyId || null,

            /*
             * Preserve current storage reference.
             *
             * FileUploadService updates Candidate.photoUrl if a new
             * photo is uploaded.
             */
            photoUrl: candidate?.photoUrl ?? null,

            isActive,

            independent,
          },
        );
      } else {
        // =================================================================
        // CREATE
        // =================================================================

        savedCandidate = await createCandidate({
          fullName: normalizedName,

          position: position.trim() || null,

          partyId: independent ? null : partyId || null,

          photoUrl: null,

          isActive,

          independent,
        });
      }

      // ==================================================================
      // PHOTO UPLOAD
      // ==================================================================

      if (photoFile && currentOrgId && currentUserId) {
        await uploadFileMultipart({
          orgId: currentOrgId,

          uploadedBy: currentUserId,

          relatedTable: "candidate",

          relatedId: savedCandidate.candidateId,

          fileType: "PHOTO",

          file: photoFile,
        });
      }

      return savedCandidate;
    },

    onSuccess: async (savedCandidate) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["candidate-master"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["candidates"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["file-uploads", "candidate", savedCandidate.candidateId],
        }),

        queryClient.invalidateQueries({
          queryKey: ["file-content"],
        }),
      ]);

      goBack();
    },
  });

  const saving = saveMutation.isPending;

  // ==========================================================================
  // NAVIGATION
  // ==========================================================================

  function goBack() {
    if (!electionId) {
      return;
    }

    navigate(`/elections/${electionId}/setup/master-candidates`);
  }

  const save = () => {
    setTouched(true);

    if (!canEdit || !formValid || saving) {
      return;
    }

    saveMutation.mutate();
  };

  // ==========================================================================
  // GUARD
  // ==========================================================================

  if (!electionId) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          Missing election ID.
        </div>
      </div>
    );
  }

  // ==========================================================================
  // EDIT LOADING
  // ==========================================================================

  if (isEdit && candidateQuery.isLoading) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          <RefreshCw size={20} className="mx-auto animate-spin text-blue-600" />

          <div className="mt-2">Loading candidate...</div>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // EDIT ERROR
  // ==========================================================================

  if (isEdit && candidateQuery.isError) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {friendlySaveError(candidateQuery.error)}
        </div>
      </div>
    );
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        {/* ================================================================
            HEADER
        ================================================================ */}

        <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              aria-label="Back to Candidate Master"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
                {isEdit ? "Edit Candidate" : "Create Candidate"}
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {isEdit
                  ? "Update this Candidate Master record and replace its photo if needed."
                  : "Create a Candidate Master record and optionally upload a photo."}
              </p>
            </div>
          </div>
        </section>

        {/* ================================================================
            BODY
        ================================================================ */}

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_300px]">
          {/* ==============================================================
              FORM
          ============================================================== */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
              <div className="flex items-center gap-2">
                <UserRound size={16} className="text-violet-600" />

                <div className="text-sm font-bold text-slate-900 sm:text-base">
                  Candidate Information
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* ========================================================
                    FULL NAME
                ======================================================== */}

                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Full Name <span className="text-red-600">*</span>
                  </label>

                  <input
                    value={fullName}
                    onChange={(event) => {
                      setFullName(event.target.value);

                      setTouched(true);
                    }}
                    placeholder="e.g., Jane Doe"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {touched && !normalizedName && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
                      <AlertCircle size={13} />
                      Candidate name is required.
                    </div>
                  )}
                </div>

                {/* ========================================================
                    POSITION
                ======================================================== */}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Position
                  </label>

                  <input
                    value={position}
                    onChange={(event) => setPosition(event.target.value)}
                    placeholder="e.g., President"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* ========================================================
                    ACTIVE
                ======================================================== */}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Status
                  </label>

                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(event) => setIsActive(event.target.checked)}
                      className="h-4 w-4 accent-blue-600"
                    />

                    <span className="text-sm font-semibold text-slate-700">
                      Active candidate
                    </span>
                  </label>
                </div>

                {/* ========================================================
                    INDEPENDENT
                ======================================================== */}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Party Affiliation
                  </label>

                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3">
                    <input
                      type="checkbox"
                      checked={independent}
                      onChange={(event) => {
                        const value = event.target.checked;

                        setIndependent(value);

                        if (value) {
                          setPartyId("");
                        }
                      }}
                      className="h-4 w-4 accent-blue-600"
                    />

                    <span className="text-sm font-semibold text-slate-700">
                      Independent
                    </span>
                  </label>
                </div>

                {/* ========================================================
                    PARTY
                ======================================================== */}

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Party
                  </label>

                  <select
                    value={partyId}
                    onChange={(event) => setPartyId(event.target.value)}
                    disabled={independent}
                    className={`min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm ${
                      independent
                        ? "cursor-not-allowed bg-slate-50 opacity-60"
                        : ""
                    }`}
                  >
                    <option value="">Select Party</option>

                    {parties.map((party) => (
                      <option key={party.partyId} value={party.partyId}>
                        {party.partyName} ({party.abbreviation})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ============================================================
                MOBILE / TABLET PHOTO
            ============================================================ */}

            <div className="border-b border-slate-200 px-3 py-3 sm:px-4 xl:hidden">
              <div className="flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {localPhotoPreview ? (
                    <img
                      src={localPhotoPreview}
                      alt="Selected candidate"
                      className="h-full w-full object-cover"
                    />
                  ) : existingPhotoQuery.isLoading ? (
                    <RefreshCw
                      size={18}
                      className="animate-spin text-slate-400"
                    />
                  ) : existingPhotoSrc ? (
                    <img
                      src={existingPhotoSrc}
                      alt={candidate?.fullName ?? "Candidate"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImagePlus size={22} className="text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 hover:bg-violet-100">
                    <Upload size={15} />

                    {existingPhoto || photoFile
                      ? "Replace Photo"
                      : "Choose Photo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        selectPhoto(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>

                  <div className="mt-1 text-[10px] text-slate-500">
                    JPG, PNG or WebP • Max 5 MB
                  </div>

                  {photoFile && (
                    <div className="mt-1 flex min-w-0 items-center gap-1">
                      <span className="truncate text-[10px] font-semibold text-slate-600">
                        {photoFile.name}
                      </span>

                      <button
                        type="button"
                        onClick={() => selectPhoto(null)}
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white"
                        aria-label="Clear selected photo"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {photoError && (
                <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
                  <AlertCircle size={13} />

                  {photoError}
                </div>
              )}
            </div>

            {/* ============================================================
                ERROR
            ============================================================ */}

            {saveMutation.isError && (
              <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />

                  {friendlySaveError(saveMutation.error)}
                </div>
              </div>
            )}

            {/* ============================================================
                ACTIONS
            ============================================================ */}

            <div className="flex flex-col-reverse gap-2 bg-slate-50 px-3 py-3 sm:flex-row sm:justify-end sm:px-4">
              <button
                type="button"
                onClick={goBack}
                disabled={saving}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={save}
                disabled={!canEdit || !formValid || saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:bg-slate-300"
              >
                {saving ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : (
                  <Save size={15} />
                )}

                {saving
                  ? isEdit
                    ? photoFile
                      ? "Updating & Uploading..."
                      : "Updating..."
                    : photoFile
                      ? "Creating & Uploading..."
                      : "Creating..."
                  : isEdit
                    ? "Update Candidate"
                    : "Create Candidate"}
              </button>
            </div>
          </section>

          {/* ==============================================================
              DESKTOP PHOTO PANEL
          ============================================================== */}

          <aside className="hidden xl:block">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-bold text-slate-900">
                  Candidate Photo
                </div>
              </div>

              <div className="p-4">
                <div className="flex h-64 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {localPhotoPreview ? (
                    <img
                      src={localPhotoPreview}
                      alt="Selected candidate"
                      className="h-full w-full object-cover"
                    />
                  ) : existingPhotoQuery.isLoading ? (
                    <RefreshCw
                      size={22}
                      className="animate-spin text-slate-400"
                    />
                  ) : existingPhotoQuery.isError ? (
                    <div className="text-center text-red-500">
                      <AlertCircle size={25} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">
                        Unable to load photo
                      </div>
                    </div>
                  ) : existingPhotoSrc ? (
                    <img
                      src={existingPhotoSrc}
                      alt={candidate?.fullName ?? "Candidate"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImagePlus size={30} className="mx-auto" />

                      <div className="mt-2 text-xs font-semibold">No photo</div>
                    </div>
                  )}
                </div>

                <label className="mt-4 inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 hover:bg-violet-100">
                  <Upload size={15} />

                  {existingPhoto || photoFile
                    ? "Replace Photo"
                    : "Choose Photo"}

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(event) =>
                      selectPhoto(event.target.files?.[0] ?? null)
                    }
                  />
                </label>

                <p className="mt-2 text-xs text-slate-500">
                  JPG, PNG, or WebP. Maximum 5 MB.
                </p>

                {photoFile && (
                  <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    <span className="truncate text-xs font-semibold text-slate-700">
                      {photoFile.name}
                    </span>

                    <button
                      type="button"
                      onClick={() => selectPhoto(null)}
                      className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}

                {photoError && (
                  <div className="mt-2 text-xs font-semibold text-red-600">
                    {photoError}
                  </div>
                )}

                {/* RECORD INFO */}

                {isEdit && candidate && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <RecordValue
                      label="Date Created"
                      value={formatDate(candidate.dateCreated)}
                    />

                    <div className="mt-3">
                      <RecordValue
                        label="Date Updated"
                        value={formatDate(candidate.dateUpdated)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        {formValid && (
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={13} />
            Required candidate information is complete.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// RECORD VALUE
// ============================================================================

function RecordValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xs font-semibold text-slate-700">{value}</div>
    </div>
  );
}
