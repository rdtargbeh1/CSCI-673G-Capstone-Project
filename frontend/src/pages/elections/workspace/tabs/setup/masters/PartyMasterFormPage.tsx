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
  X,
} from "lucide-react";

import { apiClient } from "../../../../../../shared/lib/apiClient";
import { useAuthStore } from "../../../../../../shared/store/authStore";

import {
  createParty,
  searchParties,
  updateParty,
  type PartyDto,
} from "../../../../../../shared/services/partyService";

import {
  getFileContentUrl,
  findCurrentPhoto,
  listEntityFiles,
  uploadPartyLogo,
} from "../../../../../../shared/services/fileUploadService";

type MeDto = {
  userId: string;
};

type LocationState = {
  party?: PartyDto;
};

function safeStr(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeAbbreviation(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

function friendlySaveError(error: any) {
  const message =
    safeStr(error?.response?.data?.message) ||
    safeStr(error?.response?.data?.error) ||
    safeStr(error?.message) ||
    "Failed to save party.";

  if (/duplicate|unique|already exists|constraint/i.test(message)) {
    return "Party already exists. Party name and abbreviation must be unique.";
  }

  return message;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString();
}

function validateLogo(file: File): string | null {
  const allowed = ["image/jpeg", "image/png", "image/webp"];

  if (!allowed.includes(file.type)) {
    return "Logo must be a JPG, PNG, or WebP image.";
  }

  const maxBytes = 5 * 1024 * 1024;

  if (file.size > maxBytes) {
    return "Logo must be 5 MB or smaller.";
  }

  return null;
}

export default function PartyMasterFormPage() {
  const { electionId, partyId } = useParams<{
    electionId: string;
    partyId?: string;
  }>();

  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const routeState = (location.state as LocationState | null) ?? null;
  const routeParty = routeState?.party ?? null;

  const isEdit = Boolean(partyId && partyId !== "new");

  const dashboardMode = useAuthStore((state) => state.dashboardMode);
  const currentOrgId = useAuthStore((state) => state.currentOrgId);
  const isSystemAdmin = useAuthStore((state) => state.isSystemAdmin());

  const canEdit =
    dashboardMode === "SYSTEM" || dashboardMode === "NEC" || isSystemAdmin;

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

  const [partyName, setPartyName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const partyQuery = useQuery({
    enabled: Boolean(isEdit && partyId && !routeParty),
    queryKey: ["party-master", "detail", partyId],
    queryFn: async () => {
      const page = await searchParties({
        page: 0,
        size: 500,
      });

      const found = page.items.find(
        (item: PartyDto) => item.partyId === partyId,
      );

      if (!found) {
        throw new Error("Party not found.");
      }

      return found;
    },
    staleTime: 10_000,
    retry: 1,
  });

  const party = partyQuery.data ?? routeParty ?? null;
  const effectivePartyId = party?.partyId ?? partyId ?? null;

  const filesQuery = useQuery({
    enabled: Boolean(isEdit && effectivePartyId && currentOrgId),
    queryKey: ["file-uploads", "party", effectivePartyId, currentOrgId],
    queryFn: () =>
      listEntityFiles({
        orgId: currentOrgId!,
        relatedTable: "party",
        relatedId: effectivePartyId!,
      }),
    staleTime: 10_000,
    retry: 1,
  });

  const existingPhoto = useMemo(
    () => findCurrentPhoto(filesQuery.data, party?.logoUrl ?? null),
    [filesQuery.data, party?.logoUrl],
  );

  const existingLogoUrl = existingPhoto?.fileId
    ? getFileContentUrl(existingPhoto.fileId)
    : party?.logoUrl || null;

  useEffect(() => {
    if (!party) return;

    setPartyName(safeStr(party.partyName));
    setAbbreviation(safeStr(party.abbreviation));
  }, [party]);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview(null);
      return;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [logoFile]);

  const normalizedName = useMemo(() => normalizeName(partyName), [partyName]);

  const normalizedAbbreviation = useMemo(
    () => normalizeAbbreviation(abbreviation),
    [abbreviation],
  );

  const formValid = Boolean(
    normalizedName && normalizedAbbreviation && !logoError,
  );

  const selectLogo = (file: File | null) => {
    setLogoError(null);

    if (!file) {
      setLogoFile(null);
      return;
    }

    const error = validateLogo(file);

    if (error) {
      setLogoError(error);
      setLogoFile(null);
      return;
    }

    setLogoFile(file);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!formValid) {
        throw new Error("Party name and abbreviation are required.");
      }

      if (logoFile && !currentOrgId) {
        throw new Error(
          "An organization must be selected before uploading a party logo.",
        );
      }

      if (logoFile && !currentUserId) {
        throw new Error(
          "Unable to determine the current user for the logo upload.",
        );
      }

      let savedParty: PartyDto;

      if (isEdit) {
        if (!effectivePartyId) {
          throw new Error("Missing party ID.");
        }

        savedParty = await updateParty(effectivePartyId, {
          partyName: normalizedName,
          abbreviation: normalizedAbbreviation,
          logoUrl: party?.logoUrl ?? null,
        });
      } else {
        savedParty = await createParty({
          partyName: normalizedName,
          abbreviation: normalizedAbbreviation,
          logoUrl: null,
        });
      }

      if (logoFile && currentOrgId && currentUserId) {
        await uploadPartyLogo({
          orgId: currentOrgId,
          uploadedBy: currentUserId,
          partyId: savedParty.partyId,
          file: logoFile,
        });
      }

      return savedParty;
    },
    onSuccess: async (savedParty) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["party-master"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["file-uploads", "party", savedParty.partyId],
        }),
      ]);

      goBack();
    },
  });

  const saving = saveMutation.isPending;
  const error = saveMutation.error;

  function goBack() {
    if (!electionId) return;

    navigate(`/elections/${electionId}/setup/master-parties`);
  }

  const save = () => {
    setTouched(true);

    if (!canEdit || !formValid || saving) {
      return;
    }

    saveMutation.mutate();
  };

  if (!electionId) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          Missing election ID.
        </div>
      </div>
    );
  }

  if (isEdit && partyQuery.isLoading && !routeParty) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          <RefreshCw size={20} className="mx-auto animate-spin text-blue-600" />
          <div className="mt-2">Loading party...</div>
        </div>
      </div>
    );
  }

  if (isEdit && partyQuery.isError && !routeParty) {
    return (
      <div className="app-form">
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
          {friendlySaveError(partyQuery.error)}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3">
        {/* HEADER */}
        <section className="rounded-2xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={goBack}
              disabled={saving}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <ArrowLeft size={17} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="text-lg font-bold text-slate-900 sm:text-2xl">
                {isEdit ? "Edit Party" : "Create Party"}
              </h1>

              <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                {isEdit
                  ? "Update Party Master information and replace the logo if needed."
                  : "Create a Party Master record and optionally upload its logo."}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          {/* MAIN FORM */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
              <div className="text-sm font-bold text-slate-900 sm:text-base">
                Party Information
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Party Name <span className="text-red-600">*</span>
                  </label>

                  <input
                    value={partyName}
                    onChange={(event) => {
                      setPartyName(event.target.value);
                      setTouched(true);
                    }}
                    placeholder="e.g., Unity Party"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />

                  {touched && !normalizedName && (
                    <div className="mt-1 flex items-center gap-1 text-xs font-semibold text-red-600">
                      <AlertCircle size={13} />
                      Party name is required.
                    </div>
                  )}
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Abbreviation <span className="text-red-600">*</span>
                  </label>

                  <input
                    value={abbreviation}
                    onChange={(event) => {
                      setAbbreviation(event.target.value);
                      setTouched(true);
                    }}
                    maxLength={10}
                    placeholder="e.g., UP"
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold uppercase outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-700">
                    Upload Organization
                  </label>

                  <div className="flex min-h-11 items-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-semibold text-slate-600">
                    {currentOrgId
                      ? "Current organization"
                      : "No organization selected"}
                  </div>
                </div>
              </div>
            </div>

            {/* MOBILE LOGO CARD */}
            <div className="border-b border-slate-200 px-3 py-3 sm:px-4 xl:hidden">
              <div className="flex items-center gap-2">
                <ImagePlus size={16} className="text-violet-600" />
                <div className="text-sm font-bold text-slate-900">
                  Party Logo
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Selected party logo"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : existingLogoUrl ? (
                    <img
                      src={existingLogoUrl}
                      alt={
                        party?.partyName
                          ? `${party.partyName} logo`
                          : "Party logo"
                      }
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImagePlus size={20} className="mx-auto" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <label className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 hover:bg-violet-100">
                    <Upload size={15} />
                    {existingPhoto || logoFile ? "Replace Logo" : "Choose Logo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        selectLogo(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, or WebP. Max 5 MB.
                  </p>

                  {logoFile && (
                    <div className="mt-2 flex min-w-0 items-center gap-2">
                      <span className="truncate text-xs font-semibold text-slate-700">
                        {logoFile.name}
                      </span>

                      <button
                        type="button"
                        onClick={() => selectLogo(null)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {logoError && (
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
                      <AlertCircle size={13} />
                      {logoError}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="border-b border-slate-200 px-3 py-3 sm:px-4">
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  {friendlySaveError(error)}
                </div>
              </div>
            )}

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
                  ? logoFile
                    ? "Saving & Uploading..."
                    : "Saving..."
                  : isEdit
                    ? "Save Changes"
                    : "Create Party"}
              </button>
            </div>
          </section>

          {/* DESKTOP SIDE PANEL */}
          <aside className="hidden xl:block">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                <div className="text-sm font-bold text-slate-900">
                  Party Logo
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  Upload or replace the party logo.
                </p>
              </div>

              <div className="p-4">
                <div className="flex h-44 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Selected party logo"
                      className="h-full w-full object-contain p-3"
                    />
                  ) : existingLogoUrl ? (
                    <img
                      src={existingLogoUrl}
                      alt={
                        party?.partyName
                          ? `${party.partyName} logo`
                          : "Party logo"
                      }
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <div className="text-center text-slate-400">
                      <ImagePlus size={28} className="mx-auto" />
                      <div className="mt-2 text-xs font-semibold">
                        No logo uploaded
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <label className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 text-sm font-bold text-violet-700 hover:bg-violet-100">
                    <Upload size={15} />
                    {existingPhoto || logoFile ? "Replace Logo" : "Choose Logo"}

                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(event) =>
                        selectLogo(event.target.files?.[0] ?? null)
                      }
                    />
                  </label>

                  <p className="mt-2 text-xs text-slate-500">
                    JPG, PNG, or WebP. Maximum 5 MB.
                  </p>

                  {logoFile && (
                    <div className="mt-3 flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                      <span className="truncate text-xs font-semibold text-slate-700">
                        {logoFile.name}
                      </span>

                      <button
                        type="button"
                        onClick={() => selectLogo(null)}
                        className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {logoError && (
                    <div className="mt-2 flex items-center gap-1 text-xs font-semibold text-red-600">
                      <AlertCircle size={13} />
                      {logoError}
                    </div>
                  )}
                </div>

                {isEdit && party && (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                      Record Info
                    </div>

                    <div className="mt-3 space-y-2">
                      <RecordValue
                        label="Date Created"
                        value={formatDate(party.dateCreated)}
                      />
                      <RecordValue
                        label="Date Updated"
                        value={formatDate(party.dateUpdated)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </section>
          </aside>
        </div>

        {isEdit && party && (
          <details className="rounded-2xl border border-slate-200 bg-white xl:hidden">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-bold text-slate-900">
              Record Details
            </summary>

            <div className="border-t border-slate-200 px-4 py-3">
              <div className="grid grid-cols-2 gap-3">
                <RecordValue
                  label="Date Created"
                  value={formatDate(party.dateCreated)}
                />

                <RecordValue
                  label="Date Updated"
                  value={formatDate(party.dateUpdated)}
                />
              </div>
            </div>
          </details>
        )}

        {formValid && (
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 size={13} />
            Required party information is complete.
          </div>
        )}
      </div>
    </div>
  );
}

function RecordValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </div>

      <div className="mt-1 text-xs font-semibold text-slate-700">{value}</div>
    </div>
  );
}
