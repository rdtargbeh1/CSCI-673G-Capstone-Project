// src/pages/profile/UserProfileDrawer.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../../shared/lib/apiClient";
import { useAuthStore } from "../../shared/store/authStore";
import {
  fetchMeProfile,
  updateMyProfile,
} from "../../shared/services/profileService";

/** =========================
 *  Helpers
 *  ========================= */
type Props = { open: boolean; onClose: () => void };

function safeStr(v: any) {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

function unwrapList<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (Array.isArray(data?.content)) return data.content as T[];
  return [];
}

type PartyOption = { partyId: string; partyName: string };
type CountyOption = { countyId: string; countyName: string };
type OrgOption = { orgId: string; orgName: string };

/** =========================
 *  Lookups
 *  ========================= */
async function fetchParties(): Promise<PartyOption[]> {
  const { data } = await apiClient.get("/parties");
  return unwrapList<PartyOption>(data);
}
async function fetchCounties(): Promise<CountyOption[]> {
  const { data } = await apiClient.get("/counties");
  return unwrapList<CountyOption>(data);
}
async function fetchOrgs(): Promise<OrgOption[]> {
  const { data } = await apiClient.get("/orgs");
  return unwrapList<OrgOption>(data);
}

/** =========================
 *  File Upload API (profile photo)
 *  ========================= */
type FileUploadDto = {
  fileId: string;
  url?: string;
  publicUrl?: string;
  key?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

function pickUserId(me: any): string {
  return safeStr(me?.userId) || safeStr(me?.id) || safeStr(me?.systemUserId);
}

function pickProfilePhotoUrl(me: any): string {
  // Adjust these if your backend uses a different field name
  return (
    safeStr(me?.profilePhotoUrl) ||
    safeStr(me?.avatarUrl) ||
    safeStr(me?.photoUrl) ||
    safeStr(me?.profileImageUrl)
  );
}

function pickUploadUrl(dto?: FileUploadDto | null): string {
  if (!dto) return "";
  return dto.publicUrl || dto.url || "";
}

async function uploadUserProfilePhoto(args: {
  orgId: string;
  uploadedBy: string;
  userId: string;
  file: File;
  fileType?: string; // must match your FileType enum
  storageProvider?: string; // must match your StorageProvider enum
}): Promise<FileUploadDto> {
  const form = new FormData();
  form.append("orgId", args.orgId);
  form.append("uploadedBy", args.uploadedBy);
  form.append("fileType", args.fileType ?? "PHOTO"); // ⚠️ change if enum differs
  form.append("storageProvider", args.storageProvider ?? "LOCAL"); // ⚠️ change if enum differs
  // form.append("storageProvider", args.storageProvider ?? "S3"); // ⚠️ change if enum differs
  form.append("file", args.file);
  form.append("mimeType", args.file.type || "image/*");
  form.append("sizeBytes", String(args.file.size));

  const { data } = await apiClient.post<FileUploadDto>(
    `/file-uploads/system_users/${args.userId}/upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return data;
}

/** =========================
 *  Component
 *  ========================= */
export default function UserProfileDrawer({ open, onClose }: Props) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  const currentOrgId = useAuthStore((s) => s.currentOrgId);
  const dashboardMode = useAuthStore((s) => s.dashboardMode);

  // tenant context exists only if orgId is present and not SYSTEM mode
  const isTenantContext = !!currentOrgId && dashboardMode !== "SYSTEM";

  const meQ = useQuery({
    queryKey: ["meProfile"],
    queryFn: fetchMeProfile,
    enabled: open,
    staleTime: 1000 * 30,
    retry: 1,
  });

  const me = meQ.data as any;

  // only load tenant lookups when tenant context exists
  const partiesQ = useQuery({
    queryKey: ["lookups", "parties"],
    queryFn: fetchParties,
    enabled: open && !!me && isTenantContext,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const countiesQ = useQuery({
    queryKey: ["lookups", "counties"],
    queryFn: fetchCounties,
    enabled: open && !!me && isTenantContext,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const orgsQ = useQuery({
    queryKey: ["lookups", "orgs"],
    queryFn: fetchOrgs,
    enabled: open && !!me && isTenantContext,
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const [draft, setDraft] = useState({
    firstName: "",
    lastName: "",
    userName: "",
    email: "",
    position: "",
    phoneNumber: "",
  });

  useEffect(() => {
    if (me) {
      setDraft({
        firstName: safeStr(me.firstName),
        lastName: safeStr(me.lastName),
        userName: safeStr(me.userName),
        email: safeStr(me.email),
        position: safeStr(me.position ?? ""),
        phoneNumber: safeStr(me.phoneNumber ?? ""),
      });
    }
  }, [me, open]);

  useEffect(() => {
    if (!open) setIsEditing(false);
  }, [open]);

  /** =========================
   *  Update Profile (text fields)
   *  ========================= */
  const updateM = useMutation({
    mutationFn: async () => {
      const payload = {
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        userName: draft.userName.trim(),
        email: draft.email.trim(),
        position: draft.position.trim() || undefined,
        phoneNumber: draft.phoneNumber.trim() || undefined,
      };

      if (
        !payload.firstName ||
        !payload.lastName ||
        !payload.userName ||
        !payload.email
      ) {
        throw new Error(
          "First name, last name, username, and email are required."
        );
      }

      return updateMyProfile(payload);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["meProfile"] });
      await qc.invalidateQueries({ queryKey: ["me"] });
      setIsEditing(false);
    },
  });

  /** =========================
   *  Upload Profile Photo
   *  ========================= */
  const [photoPreview, setPhotoPreview] = useState<string>("");

  const userId = pickUserId(me);
  const currentPhotoUrl = pickProfilePhotoUrl(me);
  const photoSrc = photoPreview || currentPhotoUrl;

  const uploadPhotoM = useMutation({
    mutationFn: async (file: File) => {
      if (!currentOrgId)
        throw new Error("No orgId found. Select an organization.");
      if (!userId) throw new Error("Missing userId from profile.");
      return uploadUserProfilePhoto({
        orgId: currentOrgId,
        uploadedBy: userId,
        userId,
        file,
        fileType: "PHOTO", // ⚠️ change if your FileType enum differs
        storageProvider: "S3", // ⚠️ change if your StorageProvider enum differs
      });
    },
    onSuccess: async (dto) => {
      // If your backend automatically maps the uploaded file to me.profilePhotoUrl,
      // the refetch below is enough. If not, see the note right under this file.
      await qc.invalidateQueries({ queryKey: ["meProfile"] });
      await qc.invalidateQueries({ queryKey: ["me"] });

      // Optional: if API returns a public url, keep it as immediate preview
      const u = pickUploadUrl(dto);
      if (u) setPhotoPreview(u);
    },
  });

  function onPickPhoto(file?: File | null) {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      alert("Max image size is 3MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    uploadPhotoM.mutate(file);
  }

  useEffect(() => {
    return () => {
      if (photoPreview && photoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(photoPreview);
      }
    };
  }, [photoPreview]);

  const fullName = useMemo(() => {
    const n = `${safeStr(me?.firstName)} ${safeStr(me?.lastName)}`.trim();
    return n || safeStr(me?.userName) || safeStr(me?.email) || "User";
  }, [me]);

  const partyName = useMemo(() => {
    const id = safeStr(me?.partyId);
    if (!id) return "None";
    const list = partiesQ.data ?? [];
    return list.find((p) => p.partyId === id)?.partyName ?? "Unknown";
  }, [me, partiesQ.data]);

  const countyName = useMemo(() => {
    const id = safeStr(me?.assignedCountyId);
    if (!id) return "None";
    const list = countiesQ.data ?? [];
    return list.find((c) => c.countyId === id)?.countyName ?? "Unknown";
  }, [me, countiesQ.data]);

  const orgName = useMemo(() => {
    const id = safeStr(me?.defaultOrgId);
    if (!id) return "None";
    const list = orgsQ.data ?? [];
    return list.find((o) => o.orgId === id)?.orgName ?? "Unknown";
  }, [me, orgsQ.data]);

  const roleLabel = safeStr(me?.roleName) || "—";

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/25"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet-modal: NOT full height */}
      <aside
        className={[
          "fixed z-50 right-4 top-4",
          "w-420px max-w-[calc(100vw-2rem)]",
          "bg-white shadow-2xl border border-slate-200 rounded-2xl",
          "flex flex-col max-h-[calc(100vh-2rem)]",
        ].join(" ")}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-200">
          <div>
            <div className="text-base font-extrabold text-slate-900">
              User Profile
            </div>
            <div className="text-[11px] text-slate-500">
              Your account details
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-3 space-y-3 overflow-auto">
          {meQ.isLoading ? (
            <div className="text-sm text-slate-600">Loading…</div>
          ) : meQ.isError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {(meQ.error as any)?.message ?? "Failed to load profile."}
            </div>
          ) : !me ? (
            <div className="text-sm text-slate-600">No profile data.</div>
          ) : (
            <>
              {/* Summary + Upload */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="h-11 w-11 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-base">👤</span>
                    )}
                  </div>

                  <label className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full border border-slate-200 bg-white shadow flex items-center justify-center cursor-pointer hover:bg-slate-50">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => onPickPhoto(e.target.files?.[0])}
                      disabled={uploadPhotoM.isPending}
                    />
                    <span className="text-xs">
                      {uploadPhotoM.isPending ? "…" : "📷"}
                    </span>
                  </label>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate text-sm">
                    {fullName}
                  </div>
                  <div className="text-[11px] text-slate-600 truncate">
                    @{safeStr(me.userName)} • {safeStr(me.email)}
                  </div>

                  {uploadPhotoM.isPending ? (
                    <div className="text-[11px] text-slate-500 mt-1">
                      Uploading photo…
                    </div>
                  ) : uploadPhotoM.isError ? (
                    <div className="text-[11px] text-red-600 mt-1">
                      {(uploadPhotoM.error as any)?.message ?? "Upload failed."}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Active / Verified */}
              <div className="flex gap-5">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={!!me.isActive} readOnly />
                  Active
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input type="checkbox" checked={!!me.isVerified} readOnly />
                  Verified
                </label>
              </div>

              {/* Personal */}
              <div className="rounded-2xl border border-slate-200 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-slate-900 text-sm">
                    Personal
                  </div>

                  {!isEditing ? (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setDraft({
                            firstName: safeStr(me.firstName),
                            lastName: safeStr(me.lastName),
                            userName: safeStr(me.userName),
                            email: safeStr(me.email),
                            position: safeStr(me.position ?? ""),
                            phoneNumber: safeStr(me.phoneNumber ?? ""),
                          });
                        }}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs hover:bg-slate-50"
                        disabled={updateM.isPending}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => updateM.mutate()}
                        className="rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        disabled={updateM.isPending}
                      >
                        {updateM.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  )}
                </div>

                {updateM.isError ? (
                  <div className="mb-2 rounded-xl border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                    {(updateM.error as any)?.message ?? "Update failed."}
                  </div>
                ) : null}

                <div className="space-y-1">
                  <FieldRow
                    label="First Name"
                    value={draft.firstName}
                    disabled={!isEditing}
                    onChange={(v) => setDraft((p) => ({ ...p, firstName: v }))}
                  />
                  <FieldRow
                    label="Last Name"
                    value={draft.lastName}
                    disabled={!isEditing}
                    onChange={(v) => setDraft((p) => ({ ...p, lastName: v }))}
                  />
                  <FieldRow
                    label="Username"
                    value={draft.userName}
                    disabled={!isEditing}
                    onChange={(v) => setDraft((p) => ({ ...p, userName: v }))}
                  />
                  <FieldRow
                    label="Email"
                    type="email"
                    value={draft.email}
                    disabled={!isEditing}
                    onChange={(v) => setDraft((p) => ({ ...p, email: v }))}
                  />
                  <FieldRow
                    label="Position"
                    value={draft.position}
                    disabled={!isEditing}
                    onChange={(v) => setDraft((p) => ({ ...p, position: v }))}
                  />
                  <FieldRow
                    label="Phone"
                    value={draft.phoneNumber}
                    disabled={!isEditing}
                    onChange={(v) =>
                      setDraft((p) => ({ ...p, phoneNumber: v }))
                    }
                  />
                </div>
              </div>

              {/* Admin-managed */}
              <div className="rounded-2xl border border-slate-200 p-3">
                <div className="font-semibold text-slate-900 mb-2 text-sm">
                  Admin-managed
                </div>

                <ReadOnlyRow label="Role" value={roleLabel} />

                {isTenantContext ? (
                  <>
                    <ReadOnlyRow
                      label="Party"
                      value={
                        partiesQ.isLoading
                          ? "Loading…"
                          : partiesQ.isError
                          ? "Error"
                          : partyName
                      }
                    />
                    <ReadOnlyRow
                      label="Assigned County"
                      value={
                        countiesQ.isLoading
                          ? "Loading…"
                          : countiesQ.isError
                          ? "Error"
                          : countyName
                      }
                    />
                    <ReadOnlyRow
                      label="Default Organization"
                      value={
                        orgsQ.isLoading
                          ? "Loading…"
                          : orgsQ.isError
                          ? "Error"
                          : orgName
                      }
                    />
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs hover:bg-slate-50"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  );
}

/** Same-line layout:
 *  - View:  First Name: Ronald
 *  - Edit:  label left, input right
 */
function FieldRow(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  type?: string;
}) {
  const isEditing = !props.disabled;

  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
      <div className="text-[11px] font-semibold text-slate-600">
        {props.label}:
      </div>

      {!isEditing ? (
        <div className="text-xs font-semibold text-slate-900 wrap-break-words text-right">
          {props.value || "—"}
        </div>
      ) : (
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-blue-500"
        />
      )}
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-slate-100 last:border-b-0">
      <div className="text-[11px] text-slate-500">{label}</div>
      <div className="text-xs font-semibold text-slate-800 break-all text-right">
        {value}
      </div>
    </div>
  );
}
