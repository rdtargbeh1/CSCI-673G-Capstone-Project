

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

@Component
public class NECResultMapper {

    private static final ObjectMapper M = new ObjectMapper();
    private static final TypeReference<Map<String, Integer>> TR = new TypeReference<>() {};

    public NECResultDto toDTO(NECResult r) {
        if (r == null) return null;

        Map<String, Integer> votes = parseToMapString(r.getCandidateVotes());

        return NECResultDto.builder()
                .resultId(r.getResultId())
                .electionId(r.getElection() != null ? r.getElection().getElectionId() : null)
                .electionName(r.getElection() != null ? r.getElection().getElectionName() : null)

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

    public NECResult toEntity(NECResultCreateRequest req, Election e, PollingCenter c) {
        NECResult r = new NECResult();
        r.setElection(e);
        r.setContest(null);
        r.setPollingCenter(c);

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
    // JSON helpers
    // -------------------------

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
     * ✅ FIXED FOR REAL WORLD STORAGE SHAPES:
     * Supports:
     * 1) {"candId":10}
     * 2) {"candidateVotes": {"candId":10}}   (nested wrapper)
     * 3) [{"candidateId":"candId","votes":10}, ...]
     * 4) [["candId",10],["cand2",5]]
     * 5) text JSON: "{\"candId\":10}"
     */
    public static Map<String, Integer> parseToMapString(JsonNode node) {
        if (node == null || node.isNull() || node.isMissingNode()) return Collections.emptyMap();

        JsonNode n = node;

        // 5) text JSON
        if (n.isTextual()) {
            String raw = n.asText();
            if (raw == null) return Collections.emptyMap();
            String s = raw.trim();
            if (s.isEmpty()) return Collections.emptyMap();
            try {
                n = M.readTree(s);
            } catch (Exception ignored) {
                return Collections.emptyMap();
            }
        }

        // 2) wrapper object: {"candidateVotes": {...}} or {"votes": {...}}
        if (n.isObject()) {
            JsonNode maybeWrapped = n.get("candidateVotes");
            if (maybeWrapped == null) maybeWrapped = n.get("votes");
            if (maybeWrapped != null && !maybeWrapped.isNull() && !maybeWrapped.isMissingNode()) {
                // recurse once
                return parseToMapString(maybeWrapped);
            }

            // 1) direct object map
            try {
                Map<String, Integer> raw = M.convertValue(n, TR);
                if (raw == null || raw.isEmpty()) return Collections.emptyMap();

                Map<String, Integer> out = new HashMap<>();
                for (Map.Entry<String, Integer> e : raw.entrySet()) {
                    out.put(e.getKey(), e.getValue() == null ? 0 : e.getValue());
                }
                return out;
            } catch (IllegalArgumentException ex) {
                // fall through to empty
                return Collections.emptyMap();
            }
        }

        // 3/4) arrays
        if (n.isArray()) {
            Map<String, Integer> out = new HashMap<>();

            for (JsonNode item : n) {
                if (item == null || item.isNull() || item.isMissingNode()) continue;

                // 4) pair list: ["candId", 10]
                if (item.isArray() && item.size() >= 2) {
                    String key = text(item.get(0));
                    int val = intVal(item.get(1));
                    if (key != null && !key.isBlank()) out.put(key.trim(), val);
                    continue;
                }

                // 3) object list: {candidateId/electId/optionId : "...", votes : 10}
                if (item.isObject()) {
                    String key = firstText(item, "candidateId", "electId", "optionId", "id", "key");
                    int val = firstInt(item, "votes", "totalVotes", "voteTotal", "count", "value", "total");
                    if (key != null && !key.isBlank()) out.put(key.trim(), val);
                }
            }

            return out.isEmpty() ? Collections.emptyMap() : out;
        }

        return Collections.emptyMap();
    }

    private static String firstText(JsonNode obj, String... fields) {
        for (String f : fields) {
            JsonNode v = obj.get(f);
            String s = text(v);
            if (s != null && !s.isBlank()) return s;
        }
        return null;
    }

    private static int firstInt(JsonNode obj, String... fields) {
        for (String f : fields) {
            JsonNode v = obj.get(f);
            if (v == null || v.isNull()) continue;
            if (v.isNumber()) return v.asInt(0);
            if (v.isTextual()) {
                try { return Integer.parseInt(v.asText().trim()); } catch (Exception ignored) {}
            }
        }
        return 0;
    }

    private static String text(JsonNode v) {
        if (v == null || v.isNull()) return null;
        return v.asText(null);
    }

    private static int intVal(JsonNode v) {
        if (v == null || v.isNull()) return 0;
        if (v.isNumber()) return v.asInt(0);
        if (v.isTextual()) {
            try { return Integer.parseInt(v.asText().trim()); } catch (Exception ignored) {}
        }
        return 0;
    }

    private static int nz(Integer x) {
        return x == null ? 0 : x;
    }


}
