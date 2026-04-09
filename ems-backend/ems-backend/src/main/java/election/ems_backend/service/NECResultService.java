package election.ems_backend.service;

import election.ems_backend.dto.*;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface NECResultService {
    NECResultDto create(NECResultCreateRequest req);
    NECResultDto update(UUID resultId, NECResultUpdateRequest req);
    void delete(UUID resultId);
    NECResultDto get(UUID resultId);
    Page<NECResultDto> search(UUID electionId, UUID centerId, LocalDateTime uploadedAfter, LocalDateTime uploadedBefore, Pageable pageable);

    // Rollups (totals & percentages)
    NECOverallTotalsDto totals(UUID electionId, UUID centerId);
    List<CandidateVoteTotalDto> totalsByCandidate(UUID electionId, UUID centerId);
    List<CandidateScopedTotalDto> byCountyPerCandidate(UUID electionId);
    List<CandidateScopedTotalDto> byDistrictPerCandidate(UUID electionId, UUID countyId);
    List<CandidateDailyTotalDto> dailyByCandidate(UUID electionId);


}