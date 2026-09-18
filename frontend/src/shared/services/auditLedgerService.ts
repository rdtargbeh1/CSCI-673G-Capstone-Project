

import { apiClient } from "../lib/apiClient";

export type AuditLedgerDto = {
  ledgerId: string;
  entryType: string;
  entryReference?: string | null;
  payloadHash: string;
  prevHash?: string | null;
  chainHash: string;
  actorId?: string | null;
  signature?: string | null;
  createdAt: string; // backend is LocalDateTime; treat as string
};

export type AuditLedgerRetryDto = {
  retryId: string;
  entryType?: string | null;
  entryReference?: string | null;
  payload: string;
  actorId?: string | null;
  signature?: string | null;
  lastError?: string | null;
  attempts: number;
  claimedBy?: string | null;
  claimedAt?: string | null;
  status: "PENDING" | "CLAIMED" | "SUCCESS" | "FAILED" | string;
  nextAttemptAt?: string | null;
  createdAt: string;
};

export async function fetchLedgerByType(type: string) {
  const { data } = await apiClient.get(`/admin/audit-ledger/by-type`, {
    params: { type },
  });
  return data as AuditLedgerDto[];
}

export async function fetchLedgerByReference(entryReference: string) {
  const { data } = await apiClient.get(
    `/admin/audit-ledger/by-reference/${entryReference}`
  );
  return data as AuditLedgerDto[];
}

export async function fetchLedgerLatest() {
  const { data } = await apiClient.get(`/admin/audit-ledger/latest`);
  return data as AuditLedgerDto;
}

export async function fetchLedgerVerifyErrors() {
  const { data } = await apiClient.get(`/admin/audit-ledger/verify`);
  return data as string[];
}

export async function fetchRetryList(limit = 50) {
  const { data } = await apiClient.get(`/admin/audit/retries`, {
    params: { limit },
  });
  return data as AuditLedgerRetryDto[];
}

export async function forceRetryOne(retryId: string) {
  const { data } = await apiClient.post(`/admin/audit/retries/${retryId}/retry`);
  return data as string;
}
