// src/shared/services/contestService.ts
import { apiClient } from "../lib/apiClient";
import type { ContestDto } from "../../auth/contestTypes";

export async function listContestsByElection(
  electionId: string
): Promise<ContestDto[]> {
  const res = await apiClient.get(`/admin/contests`, {
    params: { electionId },
  });
  return (res.data ?? []) as ContestDto[];
}

export async function getContest(contestId: string): Promise<ContestDto> {
  const res = await apiClient.get(`/admin/contests/${contestId}`);
  return res.data as ContestDto;
}

export async function createContest(
  dto: Partial<ContestDto>
): Promise<ContestDto> {
  const res = await apiClient.post(`/admin/contests`, dto);
  return res.data as ContestDto;
}

export async function updateContest(
  contestId: string,
  dto: Partial<ContestDto>
): Promise<ContestDto> {
  const res = await apiClient.put(`/admin/contests/${contestId}`, dto);
  return res.data as ContestDto;
}

export async function deleteContest(contestId: string): Promise<void> {
  await apiClient.delete(`/admin/contests/${contestId}`);
}
