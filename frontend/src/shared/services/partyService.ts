// src/shared/services/partyService.ts
import { apiClient } from "../lib/apiClient";

export type PartyDto = {
  partyId: string;
  partyName: string;
  abbreviation: string;
  logoUrl?: string | null;
  dateCreated?: string | null;
  dateUpdated?: string | null;
};

export type PartyCreateRequest = {
  partyName: string;
  abbreviation: string;
  logoUrl?: string | null;
};

export type PartyUpdateRequest = {
  partyName?: string;
  abbreviation?: string;
  logoUrl?: string | null;
};

export type PageResult<T> = {
  items: T[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
};

function mapSpringPage<T>(p: any): PageResult<T> {
  // Spring Page typically: content, number, size, totalElements, totalPages
  const items = (p?.content ?? []) as T[];
  return {
    items,
    page: Number(p?.number ?? 0),
    size: Number(p?.size ?? items.length ?? 0),
    totalItems: Number(p?.totalElements ?? items.length ?? 0),
    totalPages: Math.max(1, Number(p?.totalPages ?? 1)),
  };
}

export async function searchParties(params: {
  page: number;
  size: number;
  q?: string;
}): Promise<PageResult<PartyDto>> {
  const res = await apiClient.get(`/parties`, {
    params: {
      page: params.page,
      size: params.size,
      q: params.q?.trim() || undefined,
    },
  });
  return mapSpringPage<PartyDto>(res.data);
}

export async function getParty(partyId: string): Promise<PartyDto> {
  const res = await apiClient.get(`/parties/${partyId}`);
  return res.data as PartyDto;
}

export async function createParty(req: PartyCreateRequest): Promise<PartyDto> {
  const res = await apiClient.post(`/parties`, req); // ✅
  return res.data as PartyDto;
}

export async function updateParty(
  partyId: string,
  req: PartyUpdateRequest
): Promise<PartyDto> {
  const res = await apiClient.put(`/parties/${partyId}`, req);
  return res.data as PartyDto;
}

export async function deleteParty(partyId: string): Promise<void> {
  await apiClient.delete(`/parties/${partyId}`);
}
