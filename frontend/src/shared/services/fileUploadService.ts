// src/shared/services/fileUploadService.ts
import { apiClient } from "../lib/apiClient";

export type FileUploadDto = {
  fileId: string;
  orgId: string;
  relatedTable: string;
  relatedId: string;
  fileType: string;
  storageProvider: string;
  url?: string;
  publicUrl?: string;
  key?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
  createdAt?: string;
};

// ✅ MUST match backend enum exactly
export type BackendFileType =
  | "TALLY_SHEET"
  | "PHOTO"
  | "AUDIO"
  | "VIDEO"
  | "DOCUMENT";
export type BackendStorageProvider = "S3" | "LOCAL" | "AZURE" | "GCS"; // adjust to your backend enum

/** Generic single multipart upload (works for any relatedTable / type) */
export async function uploadFileMultipart(args: {
  orgId: string;
  uploadedBy: string;
  relatedTable: string;
  relatedId: string;
  fileType: BackendFileType; // ✅ enforce enum-safe types
  storageProvider?: BackendStorageProvider;
  file: File;
}) {
  const form = new FormData();

  form.append("orgId", args.orgId);
  form.append("uploadedBy", args.uploadedBy);
  form.append("fileType", args.fileType); // ✅ will be PHOTO/TALLY_SHEET/etc.
  form.append("storageProvider", args.storageProvider ?? "S3");

  form.append("file", args.file);
  form.append("mimeType", args.file.type || "application/octet-stream");
  form.append("sizeBytes", String(args.file.size));

  const { data } = await apiClient.post<FileUploadDto>(
    `/file-uploads/${args.relatedTable}/${args.relatedId}/upload`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );

  return data;
}

/** Convenience: profile photo upload (defaults to PHOTO) */
export async function uploadUserProfilePhoto(args: {
  orgId: string;
  uploadedBy: string;
  userId: string;
  file: File;
  storageProvider?: BackendStorageProvider;
}) {
  return uploadFileMultipart({
    orgId: args.orgId,
    uploadedBy: args.uploadedBy,
    relatedTable: "system_users",
    relatedId: args.userId,
    fileType: "PHOTO", // ✅ FIXED (your enum)
    storageProvider: args.storageProvider ?? "S3",
    file: args.file,
  });
}

// helper (handle url field variations)
export function getFileUrl(dto?: FileUploadDto | null) {
  if (!dto) return "";
  return dto.publicUrl || dto.url || "";
}
