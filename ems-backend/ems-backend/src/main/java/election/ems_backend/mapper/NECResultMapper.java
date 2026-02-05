package election.ems_backend.mapper;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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

                // ✅ DTO field name is "contest" (UUID)
                .contest(r.getContest() != null ? r.getContest().getContestId() : null)
                .contestName(r.getContest() != null ? r.getContest().getContestName() : null)

                .centerId(r.getPollingCenter() != null ? r.getPollingCenter().getCenterId() : null)
                .pollingCenterName(r.getPollingCenter() != null ? r.getPollingCenter().getCenterName() : null)

                .candidateVotes(votes)
                .totalRegisteredVoters(nz(r.getTotalRegisteredVoters()))
                .ballotsInBox(nz(r.getBallotsInBox()))
                .invalidBallots(nz(r.getInvalidBallots()))
                .unmarkedBallots(nz(r.getUnmarkedBallots()))
                .unusedBallots(nz(r.getUnusedBallots()))
                .rejectedBallots(nz(r.getRejectedBallots()))
                .spoiledBallots(nz(r.getSpoiledBallots()))
                .source(r.getSource())
                .uploadTime(r.getUploadTime())
                .resultSignature(r.getResultSignature())
                .resultSignerKeyId(r.getResultSignerKeyId())
                .chainHash(r.getChainHash())
                .build();
    }

    /**
     * Build entity from create request.
     * Accepts candidateVotes as Map with keys that can be UUID or String.
     */
    public NECResult toEntity(NECResultCreateRequest req, Election e, PollingCenter c) {
        NECResult r = new NECResult();
        r.setElection(e);
        r.setContest(null); // contest is set by service if your entity has it; safe default
        r.setPollingCenter(c);

        // ✅ JsonNode for jsonb
        r.setCandidateVotes(write(req.getCandidateVotes()));

        r.setTotalRegisteredVoters(nz(req.getTotalRegisteredVoters()));
        r.setBallotsInBox(nz(req.getBallotsInBox()));
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
        if (req.getBallotsInBox() != null) r.setBallotsInBox(req.getBallotsInBox());
        if (req.getInvalidBallots() != null) r.setInvalidBallots(req.getInvalidBallots());
        if (req.getUnmarkedBallots() != null) r.setUnmarkedBallots(req.getUnmarkedBallots());
        if (req.getUnusedBallots() != null) r.setUnusedBallots(req.getUnusedBallots());
        if (req.getRejectedBallots() != null) r.setRejectedBallots(req.getRejectedBallots());
        if (req.getSpoiledBallots() != null) r.setSpoiledBallots(req.getSpoiledBallots());
        if (req.getSource() != null) r.setSource(req.getSource());
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
    // JSON helpers - JsonNode <-> Map<String,Integer>
    // -------------------------

    /**
     * Convert Map<?,Integer> -> JsonNode object for jsonb persistence.
     * Keys are stringified (UUID.toString()) because JSON object keys must be strings.
     */
    private static JsonNode write(Map<?, Integer> map) {
        ObjectNode obj = M.createObjectNode();
        if (map == null || map.isEmpty()) return obj;

        for (Map.Entry<?, Integer> e : map.entrySet()) {
            if (e.getKey() == null) continue;

            String key = e.getKey().toString();
            int val = (e.getValue() == null ? 0 : e.getValue());
            obj.put(key, val);
        }
        return obj;
    }

    /**
     * Convert JsonNode (stored jsonb) -> Map<String,Integer> for DTO output.
     */
    public static Map<String, Integer> parseToMapString(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) return Collections.emptyMap();
        if (!node.isObject()) return Collections.emptyMap();

        try {
            Map<String, Integer> raw = M.convertValue(node, TR);
            if (raw == null || raw.isEmpty()) return Collections.emptyMap();

            // normalize null values to 0
            Map<String, Integer> out = new HashMap<>();
            for (Map.Entry<String, Integer> e : raw.entrySet()) {
                out.put(e.getKey(), e.getValue() == null ? 0 : e.getValue());
            }
            return out;
        } catch (IllegalArgumentException ex) {
            throw new IllegalStateException("Bad candidateVotes json", ex);
        }
    }

    private static int nz(Integer x) {
        return x == null ? 0 : x;
    }


}

