// src/shared/services/fileUploadService.ts

import { apiClient } from "../lib/apiClient";

// ============================================================================
// BACKEND TYPES
// ============================================================================

export type BackendFileType =
  | "TALLY_SHEET"
  | "PHOTO"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENT";

export type BackendStorageProvider = "S3" | "LOCAL" | "AZURE" | "GCS";

// ============================================================================
// DTO
// ============================================================================

export type FileUploadDto = {
  fileId: string;

  orgId?: string | null;

  relatedTable: string;

  relatedId: string;

  fileType: BackendFileType | string;

  /*
   * Backend storage location.
   *
   * LOCAL:
   * file:///...
   *
   * S3:
   * S3 object key
   *
   * Do NOT put this directly into <img src>.
   */
  fileUrl?: string | null;

  storageProvider?: BackendStorageProvider | string | null;

  mimeType?: string | null;

  sizeBytes?: number | null;

  sha256?: string | null;

  uploadedBy?: string | null;

  tags?: Record<string, unknown> | null;

  dateDeleted?: string | null;

  dateUpdated?: string | null;

  // ==========================================================================
  // LEGACY / COMPATIBILITY FIELDS
  // ==========================================================================

  url?: string | null;

  publicUrl?: string | null;

  key?: string | null;

  fileName?: string | null;

  createdAt?: string | null;
};

// ============================================================================
// SINGLE MULTIPART UPLOAD
//
// Storage provider is intentionally NOT supplied by the frontend.
//
// Backend determines:
//
// LOCAL
//
// or
//
// S3
//
// based on:
//
// app.storage.provider
// ============================================================================

export async function uploadFileMultipart(args: {
  orgId: string;

  uploadedBy: string;

  relatedTable: string;

  relatedId: string;

  fileType: BackendFileType;

  file: File;
}): Promise<FileUploadDto> {
  const form = new FormData();

  form.append("orgId", args.orgId);

  form.append("uploadedBy", args.uploadedBy);

  form.append("fileType", args.fileType);

  form.append("file", args.file, args.file.name);

  if (args.file.type) {
    form.append("mimeType", args.file.type);
  }

  form.append("sizeBytes", String(args.file.size));

  /*
   * Do NOT manually set Content-Type.
   *
   * Browser/Axios must add the multipart boundary.
   */
  const { data } = await apiClient.post<FileUploadDto>(
    `/file-uploads/${encodeURIComponent(
      args.relatedTable,
    )}/${encodeURIComponent(args.relatedId)}/upload`,

    form,
  );

  return data;
}

// ============================================================================
// GENERIC PHOTO UPLOAD
// ============================================================================

export async function uploadEntityPhoto(args: {
  orgId: string;

  uploadedBy: string;

  relatedTable: string;

  relatedId: string;

  file: File;
}): Promise<FileUploadDto> {
  return uploadFileMultipart({
    orgId: args.orgId,

    uploadedBy: args.uploadedBy,

    relatedTable: args.relatedTable,

    relatedId: args.relatedId,

    fileType: "PHOTO",

    file: args.file,
  });
}

// ============================================================================
// PARTY LOGO
// ============================================================================

export async function uploadPartyLogo(args: {
  orgId: string;

  uploadedBy: string;

  partyId: string;

  file: File;
}): Promise<FileUploadDto> {
  return uploadFileMultipart({
    orgId: args.orgId,

    uploadedBy: args.uploadedBy,

    relatedTable: "party",

    relatedId: args.partyId,

    fileType: "PHOTO",

    file: args.file,
  });
}

// ============================================================================
// USER PROFILE PHOTO
//
// Existing public API retained.
// ============================================================================

export async function uploadUserProfilePhoto(args: {
  orgId: string;

  uploadedBy: string;

  userId: string;

  file: File;
}): Promise<FileUploadDto> {
  return uploadFileMultipart({
    orgId: args.orgId,

    uploadedBy: args.uploadedBy,

    relatedTable: "system_users",

    relatedId: args.userId,

    fileType: "PHOTO",

    file: args.file,
  });
}

// ============================================================================
// LIST ENTITY FILES
// ============================================================================

export async function listEntityFiles(args: {
  orgId: string;

  relatedTable: string;

  relatedId: string;
}): Promise<FileUploadDto[]> {
  const { data } = await apiClient.get<FileUploadDto[]>(
    "/file-uploads",

    {
      params: {
        orgId: args.orgId,

        relatedTable: args.relatedTable,

        relatedId: args.relatedId,
      },
    },
  );

  return Array.isArray(data) ? data : [];
}

// ============================================================================
// GET FILE METADATA
// ============================================================================

export async function getFileUpload(fileId: string): Promise<FileUploadDto> {
  const { data } = await apiClient.get<FileUploadDto>(
    `/file-uploads/${encodeURIComponent(fileId)}`,
  );

  return data;
}

// ============================================================================
// DELETE / SOFT DELETE
// ============================================================================

export async function deleteFileUpload(
  fileId: string,
  requesterId: string,
): Promise<void> {
  await apiClient.delete(
    `/file-uploads/${encodeURIComponent(fileId)}`,

    {
      params: {
        requesterId,
      },
    },
  );
}

// ============================================================================
// AUTHENTICATED FILE CONTENT
//
// IMPORTANT:
//
// A normal:
//
// <img src="/api/file-uploads/.../content">
//
// does not use apiClient and therefore may not contain the JWT.
//
// Instead:
//
// 1. apiClient requests the content.
// 2. JWT is included.
// 3. Backend returns LOCAL bytes or follows S3 response.
// 4. Frontend creates a temporary browser object URL.
// ============================================================================

export async function fetchFileBlob(fileId: string): Promise<Blob> {
  if (!fileId) {
    throw new Error("File ID is required.");
  }

  const response = await apiClient.get(
    `/file-uploads/${encodeURIComponent(fileId)}/content`,

    {
      responseType: "blob",
    },
  );

  return response.data as Blob;
}

// ============================================================================
// RAW CONTENT ENDPOINT
//
// Useful for public/unsecured contexts only.
//
// For authenticated media rendering, use fetchFileBlob().
// ============================================================================

export function getFileContentUrl(fileId: string | null | undefined): string {
  if (!fileId) {
    return "";
  }

  const rawBase = String(apiClient.defaults.baseURL ?? "");

  const base = rawBase.replace(/\/+$/, "");

  return `${base}/file-uploads/${encodeURIComponent(fileId)}/content`;
}

// ============================================================================
// FIND CURRENT PHOTO
// ============================================================================

export function findCurrentPhoto(
  files: FileUploadDto[] | null | undefined,

  currentFileUrl: string | null | undefined,
): FileUploadDto | null {
  if (!files || files.length === 0) {
    return null;
  }

  const photos = files.filter(
    (file) =>
      !file.dateDeleted &&
      (file.fileType === "PHOTO" ||
        file.mimeType?.toLowerCase().startsWith("image/")),
  );

  if (photos.length === 0) {
    return null;
  }

  /*
   * Domain entity points at the currently selected storage location.
   *
   * Example:
   *
   * Party.logoUrl === FileUpload.fileUrl
   */
  if (currentFileUrl) {
    const exact = photos.find(
      (file) => getStoredFileUrl(file) === currentFileUrl,
    );

    if (exact) {
      return exact;
    }
  }

  /*
   * Compatibility fallback.
   *
   * If old data does not have a matching domain media pointer,
   * use the newest active photo.
   */
  return [...photos].sort((first, second) => {
    const firstDate = first.dateUpdated ?? first.createdAt;

    const secondDate = second.dateUpdated ?? second.createdAt;

    const firstTime = firstDate ? new Date(firstDate).getTime() : 0;

    const secondTime = secondDate ? new Date(secondDate).getTime() : 0;

    return secondTime - firstTime;
  })[0];
}

// ============================================================================
// STORAGE LOCATION
// ============================================================================

export function getStoredFileUrl(dto?: FileUploadDto | null): string {
  if (!dto) {
    return "";
  }

  return dto.fileUrl || dto.key || dto.url || dto.publicUrl || "";
}

// ============================================================================
// LEGACY HELPER
// ============================================================================

export function getFileUrl(dto?: FileUploadDto | null): string {
  return getStoredFileUrl(dto);
}
