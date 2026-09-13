import { apiClient, sysClient } from "../lib/apiClient";
import { useAuthStore } from "../store/authStore";

export type TallySheetDto = {
  uploadId: string;
  orgId: string;
  submissionId: string;

  imageUrl: string;        // IMPORTANT: this is what you use to view/download
  fileSha256?: string;

  dateUploaded?: string;
  lastUpdated?: string;

  ocrExtracted?: string;
};

function getCtx() {
  try {
    const s = useAuthStore.getState();
    return {
      mode: s.dashboardMode,
      storeOrgId: s.currentOrgId ?? null,
    };
  } catch {
    return { mode: "TENANT" as const, storeOrgId: null as string | null };
  }
}

function pickClient() {
  const { mode } = getCtx();
  return mode === "SYSTEM" ? sysClient : apiClient;
}

function tenantHeaders(preferredOrgId?: string | null) {
  const { mode, storeOrgId } = getCtx();
  if (mode === "SYSTEM") return undefined; // SYSTEM must never send X-Org-Id
  const orgId = preferredOrgId ?? storeOrgId;
  return orgId ? { "X-Org-Id": orgId } : undefined;
}

export async function listTallySheetsBySubmission(
  submissionId: string,
  orgId?: string | null
): Promise<TallySheetDto[]> {
  const client = pickClient();
  const res = await client.get(`/tally-sheets/submission/${submissionId}`, {
    headers: tenantHeaders(orgId ?? null),
  });
  return res.data as TallySheetDto[];
}

/**
 * Download with axios so auth headers apply if imageUrl is protected.
 * Works for absolute URLs (https://...) or relative URLs (/files/..).
 */
export async function downloadTallySheetBlob(params: {
  url: string;
  orgId?: string | null;
}): Promise<Blob> {
  const client = pickClient();
  const res = await client.get(params.url, {
    headers: tenantHeaders(params.orgId ?? null),
    responseType: "blob" as any,
  });
  return res.data as Blob;
}



// // src/shared/services/tallySheetService.ts

// import { apiClient } from "../lib/apiClient";

// /**
//  * DTO aligned EXACTLY with backend TallySheetDto
//  */
// export type TallySheetDto = {
//   uploadId: string;
//   imageUrl: string;
//   fileSha256?: string | null;
//   dateUploaded: string;
//   lastUpdated?: string | null;
//   ocrExtracted?: string | null;
// };

// /**
//  * ✅ LIST tally sheets BY SUBMISSION
//  * Backend: GET /api/tally-sheets/submission/{submissionId}
//  */
// export async function listBySubmission(
//   submissionId: string
// ): Promise<TallySheetDto[]> {
//   const { data } = await apiClient.get(
//     `/tally-sheets/submission/${submissionId}`
//   );
//   return data;
// }

// /**
//  * ✅ Upload tally sheet (multipart)
//  * Backend: POST /api/tally-sheets/{submissionId}/upload?orgId=
//  */
// export async function uploadTallySheet(payload: {
//   orgId: string;
//   submissionId: string;
//   file: File;
// }): Promise<TallySheetDto> {
//   const form = new FormData();
//   form.append("file", payload.file);

//   const { data } = await apiClient.post(
//     `/tally-sheets/${payload.submissionId}/upload`,
//     form,
//     {
//       params: { orgId: payload.orgId },
//       headers: { "Content-Type": "multipart/form-data" },
//     }
//   );

//   return data;
// }

// /**
//  * ✅ Update OCR JSON
//  * Backend: PUT /api/tally-sheets/{uploadId}/ocr
//  */
// export async function updateTallyOcr(payload: {
//   uploadId: string;
//   ocrExtracted: string;
// }): Promise<TallySheetDto> {
//   const { data } = await apiClient.put(
//     `/tally-sheets/${payload.uploadId}/ocr`,
//     { ocrExtracted: payload.ocrExtracted }
//   );
//   return data;
// }

// /**
//  * ✅ Delete tally sheet
//  * Backend: DELETE /api/tally-sheets/{uploadId}
//  */
// export async function deleteTallySheet(uploadId: string): Promise<void> {
//   await apiClient.delete(`/tally-sheets/${uploadId}`);
// }
