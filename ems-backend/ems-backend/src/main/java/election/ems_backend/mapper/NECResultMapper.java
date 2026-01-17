package election.ems_backend.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import election.ems_backend.dto.NECResultCreateRequest;
import election.ems_backend.dto.NECResultDto;
import election.ems_backend.dto.NECResultUpdateRequest;
import election.ems_backend.dto.NecResultStagingDto;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.NECResult;
import election.ems_backend.entity.NecResultStaging;
import election.ems_backend.entity.PollingCenter;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Unified mapper for NEC result-related entities and DTOs.
 *
 * Notes:
 * - Candidate votes JSON is stored in the DB as jsonb. We normalize in Java to Map<String,Integer>
 *   where candidate id keys are stringified (UUID.toString()) to avoid mapping issues with JSON keys.
 * - Methods accept generic Map<?,Integer> when converting from external requests to be forgiving.
 */
@Component
public class NECResultMapper {

    private static final ObjectMapper M = new ObjectMapper();
    private static final TypeReference<Map<String, Integer>> TR = new TypeReference<>() {};

    // -------------------------
    // NECResult (authoritative) <-> DTO
    // -------------------------
    public NECResultDto toDTO(NECResult r) {

        if (r == null) return null;
        Map<String, Integer> votes = parseToMapString(r.getCandidateVotes());
        return NECResultDto.builder()
                .resultId(r.getResultId())
                .electionId(r.getElection() != null ? r.getElection().getElectionId() : null)
                .electionName(r.getElection() != null ? r.getElection().getElectionName() : null)
                .centerId(r.getPollingCenter() != null ? r.getPollingCenter().getCenterId() : null)
                .pollingCenterName(r.getPollingCenter() != null ? r.getPollingCenter().getCenterName() : null)
                .candidateVotes(votes)
                .totalRegisteredVoters(nz(r.getTotalRegisteredVoters()))
                .ballotsCast(nz(r.getBallotsCast()))
                .invalidBallots(nz(r.getInvalidBallots()))
                .unmarkedBallots(nz(r.getUnmarkedBallots()))
                .unusedBallots(nz(r.getUnusedBallots()))
                .rejectedBallots(nz(r.getRejectedBallots()))
                .spoiledBallots(nz(r.getSpoiledBallots()))
                .source(r.getSource())
                .uploadTime(r.getUploadTime())
                .build();


    }


    /**
     * Build entity from create request. Accepts candidateVotes as Map with keys that can be UUID or String.
     */
    public NECResult toEntity(NECResultCreateRequest req, Election e, PollingCenter c) {
        NECResult r = new NECResult();
        r.setElection(e);
        r.setPollingCenter(c);
        r.setCandidateVotes(write(req.getCandidateVotes()));
        r.setTotalRegisteredVoters(nz(req.getTotalRegisteredVoters()));
        r.setBallotsCast(nz(req.getBallotsCast()));
        r.setInvalidBallots(nz(req.getInvalidBallots()));
        r.setUnmarkedBallots(nz(req.getUnmarkedBallots()));
        r.setUnusedBallots(nz(req.getUnusedBallots()));
        r.setRejectedBallots(nz(req.getRejectedBallots()));
        r.setSpoiledBallots(nz(req.getSpoiledBallots()));
        r.setSource(req.getSource());
        return r;
    }

    public void apply(NECResultUpdateRequest req, NECResult r) {
        if (req == null || r == null) return;
        if (req.getCandidateVotes() != null) r.setCandidateVotes(write(req.getCandidateVotes()));
        if (req.getTotalRegisteredVoters() != null) r.setTotalRegisteredVoters(req.getTotalRegisteredVoters());
        if (req.getBallotsCast() != null)    r.setBallotsCast(req.getBallotsCast());
        if (req.getInvalidBallots() != null) r.setInvalidBallots(req.getInvalidBallots());
        if (req.getUnmarkedBallots() != null)   r.setUnmarkedBallots(req.getUnmarkedBallots());
        if (req.getUnusedBallots() != null)   r.setUnusedBallots(req.getUnusedBallots());
        if (req.getRejectedBallots() != null)r.setRejectedBallots(req.getRejectedBallots());
        if (req.getSpoiledBallots() != null) r.setSpoiledBallots(req.getSpoiledBallots());
        if (req.getSource() != null)         r.setSource(req.getSource());
    }

    // -------------------------
    // NecResultStaging <-> DTO
    // -------------------------
    public NecResultStagingDto toDto(NecResultStaging s) {
        if (s == null) return null;
        NecResultStagingDto d = new NecResultStagingDto();
        d.setStagingId(s.getStagingId());
        d.setBatchId(s.getBatchId());
        d.setElectionId(s.getElectionId());
        d.setCenterCode(s.getCenterCode());
        d.setAssignedCenterId(s.getAssignedCenterId());
        d.setCandidateVotes(s.getCandidateVotes());
        d.setTotalRegisteredVoters(s.getTotalRegisteredVoters());
        d.setBallotsCast(s.getBallotsCast());
        d.setInvalidBallots(s.getInvalidBallots());
        d.setUnmarkedBallots(s.getUnmarkedBallots());
        d.setUnusedBallots(s.getUnusedBallots());
        d.setRejectedBallots(s.getRejectedBallots());
        d.setSpoiledBallots(s.getSpoiledBallots());
        d.setSource(s.getSource());
        d.setUploadedBy(s.getUploadedBy() != null ? s.getUploadedBy().getUserId() : null);
        d.setUploadTime(s.getUploadTime());
        d.setValidated(s.getValidated());
        d.setValidationErrors(s.getValidationErrors());
        d.setValidatedBy(s.getValidatedBy() != null ? s.getValidatedBy().getUserId() : null);
        d.setValidatedAt(s.getValidatedAt());
        d.setIsPublished(s.getIsPublished());
        d.setPublishedBy(s.getPublishedBy() != null ? s.getPublishedBy().getUserId() : null);
        d.setPublishedAt(s.getPublishedAt());
        d.setProcessed(s.getProcessed());
        d.setProcessedAt(s.getProcessedAt());
        d.setProcessedResultId(s.getProcessedResultId());
        return d;
    }

    // -------------------------
    // JSON helpers - use Map<String,Integer> consistently
    // -------------------------
    private static String write(Map<?, Integer> map) {
        try {
            if (map == null) return M.writeValueAsString(Collections.emptyMap());
            // Convert keys to String (UUID or plain strings) to ensure JSON keys are strings
            Map<String, Integer> asStrings = new HashMap<>();
            for (Map.Entry<?, Integer> e : map.entrySet()) {
                asStrings.put(e.getKey() == null ? "" : e.getKey().toString(), e.getValue() == null ? 0 : e.getValue());
            }
            return M.writeValueAsString(asStrings);
        } catch (Exception e) {
            throw new IllegalArgumentException("Invalid candidateVotes", e);
        }
    }

    public static Map<String, Integer> parseToMapString(String json) {
        try {
            if (json == null || json.isBlank()) return Collections.emptyMap();
            return M.readValue(json, TR);
        } catch (Exception e) {
            throw new IllegalStateException("Bad candidateVotes json", e);
        }
    }


    private static int nz(Integer x) { return x == null ? 0 : x; }
}

