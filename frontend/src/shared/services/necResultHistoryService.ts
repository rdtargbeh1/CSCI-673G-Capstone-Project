
import { apiClient } from "../lib/apiClient";

export type NecResultHistoryRow = {
  historyId: string;

  resultId: string;
  electionId: string;
  contestId: string;
  centerId: string;

  changeType: string;          // PUBLISH | UNPUBLISH | UNPUBLISHED_MANUAL | RECOMPUTED | CLEARED ...
  changedBy?: string;          // UUID
  changedByUserName?: string | null;
  dateChanged: string;

  notes?: string;
  userNote?: string;

  candidateVotes?: Record<string, number>;

  totalRegisteredVoters?: number;
  ballotsCast?: number;        // (your DTO uses ballotsCast)
  invalidBallots?: number;

  unmarkedBallots?: number;
  unusedBallots?: number;
  rejectedBallots?: number;
  spoiledBallots?: number;
};

// existing functions remain as you already have:
export async function getNecHistoryByElection(electionId: string) {
  const res = await apiClient.get<NecResultHistoryRow[]>(
    `/nec/results/history/election/${electionId}`
  );
  return res.data;
}

export async function getNecHistoryByContest(electionId: string, contestId: string) {
  const res = await apiClient.get<NecResultHistoryRow[]>(
    `/nec/results/history/election/${electionId}/contest/${contestId}`
  );
  return res.data;
}

export async function getNecHistoryByScope(
  electionId: string,
  contestId: string,
  centerId: string
) {
  const res = await apiClient.get<NecResultHistoryRow[]>(
    `/nec/results/history/election/${electionId}/contest/${contestId}/center/${centerId}`
  );
  return res.data;
}

export async function fetchNecResultHistory(params: {
  electionId: string;
  contestId?: string;
  centerId?: string;
  resultId?: string;
}) {
  const { electionId, contestId, centerId, resultId } = params;

  if (resultId) {
    const res = await apiClient.get<NecResultHistoryRow[]>(
      `/nec/results/history/result/${resultId}`
    );
    return res.data;
  }

  if (contestId && centerId) return getNecHistoryByScope(electionId, contestId, centerId);
  if (contestId) return getNecHistoryByContest(electionId, contestId);

  return getNecHistoryByElection(electionId);
}

