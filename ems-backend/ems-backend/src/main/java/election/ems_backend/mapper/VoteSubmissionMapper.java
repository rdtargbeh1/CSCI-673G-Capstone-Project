package election.ems_backend.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import election.ems_backend.dto.VoteSubmissionCreateRequest;
import election.ems_backend.dto.VoteSubmissionDto;
import election.ems_backend.dto.VoteSubmissionUpdateRequest;
import election.ems_backend.entity.*;
import election.ems_backend.enums.VoteStatus;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;


@Component
public class VoteSubmissionMapper {

    private static final GeometryFactory GF = new GeometryFactory(new PrecisionModel(), 4326);
    private final ObjectMapper objectMapper = new ObjectMapper();


    public VoteSubmissionDto toDTO(VoteSubmission s) {
        Organization org = s.getOrganization();
        Election e = s.getElection();
        PollingPlace p = s.getPollingPlace();
        PollingCenter c = s.getPollingCenter();
        SystemUser a = s.getAgent();
        SystemUser v = s.getVerifiedBy();
        SystemUser f = s.getFlaggedBy(); // ✅ NEW
        Contest contest = s.getContest();

        Double lat = null, lon = null;
        if (s.getGpsLocation() != null) {
            lon = s.getGpsLocation().getX();
            lat = s.getGpsLocation().getY();
        }

        String agentName = a != null ? a.getFirstName() + " " + a.getLastName() : null;
        String verifiedByName = v != null ? v.getFirstName() + " " + v.getLastName() : null;

        // ✅ NEW (safe, does not touch lazy role)
        String flaggedByName = f != null ? (f.getFirstName() + " " + f.getLastName()).trim() : null;

        Map<String, Integer> votesMap =
                s.getCandidateVotes() != null ? s.getCandidateVotes() : Collections.emptyMap();

        int validVotes = votesMap.values().stream().mapToInt(Integer::intValue).sum();

        int invalidTotal =
                nz(s.getInvalidBallots()) +
                        nz(s.getUnmarkedBallots()) +
                        nz(s.getRejectedBallots()) +
                        nz(s.getSpoiledBallots());

        String candidateVotesJson;
        try {
            candidateVotesJson = objectMapper.writeValueAsString(votesMap);
        } catch (Exception ex) {
            candidateVotesJson = "{}";
        }

        return VoteSubmissionDto.builder()
                .submissionId(s.getSubmissionId())

                .orgId(org.getOrgId())
                .orgName(org.getOrgName())

                .electionId(e.getElectionId())
                .electionName(e.getElectionName())
                .year(e.getYear())
                .contestId(s.getContestId())
                .contestName(contest != null ? contest.getContestName() : null)
                .contestCategory(contest != null && contest.getCategory() != null ? contest.getCategory().name() : null)
                .contestScopeType(contest != null && contest.getScopeType() != null ? contest.getScopeType().name() : null)

                .centerId(c.getCenterId())
                .centerCode(c.getCode())
                .centerName(c.getCenterName())

                .placeId(p.getPlaceId())
                .placeCode(p.getCode())
                .placeNumber(p.getPlaceNumber())
                .placeLabel(p.getLabel())

                .agentId(a.getUserId())
                .agentName(agentName)

                .submissionTime(s.getSubmissionTime())

                .validVotes(validVotes)
                .invalidTotal(invalidTotal)

                .candidateVotesJson(candidateVotesJson)
                .candidateVotes(votesMap)

                .ballotsInBox(s.getBallotsInBox())
                .invalidBallots(s.getInvalidBallots())
                .unmarkedBallots(s.getUnmarkedBallots())
                .rejectedBallots(s.getRejectedBallots())
                .spoiledBallots(s.getSpoiledBallots())
                .unusedBallots(s.getUnusedBallots())

                .status(s.getStatus())
                .comments(s.getComments())

                // ✅ FIX: never return entity; return primitives only
                .flaggedBy(f != null ? f.getUserId() : null)
                .flaggedByName(flaggedByName)
                .dateFlagged(s.getDateFlagged())

                .latitude(lat)
                .longitude(lon)

                .verifiedBy(v != null ? v.getUserId() : null)
                .verifiedByName(verifiedByName)
                .dateVerified(s.getDateVerified())

                .clientIp(s.getClientIp())
                .userAgent(s.getUserAgent())
                .submissionHash(s.getSubmissionHash())
                .version(s.getVersion())
                .idempotencyKey(s.getIdempotencyKey())

                .submissionSignerKeyId(s.getSubmissionSignerKeyId())
                .submissionSignature(s.getSubmissionSignature())
                .chainHash(s.getChainHash())
                .build();
    }



    public VoteSubmission toEntity(
            VoteSubmissionCreateRequest req,
            Organization org, Election e, PollingCenter c, SystemUser agent
    ) {
        VoteSubmission s = new VoteSubmission();

        s.setOrganization(org);
        s.setElection(e);
        s.setPollingCenter(c);
        s.setAgent(agent);
        s.setContestId(req.getContestId());
        s.setCandidateVotes(req.getCandidateVotes());

        s.setBallotsInBox(nz(req.getBallotsInBox()));
        s.setInvalidBallots(nz(req.getInvalidBallots()));
        s.setUnmarkedBallots(nz(req.getUnmarkedBallots()));
        s.setRejectedBallots(nz(req.getRejectedBallots()));
        s.setSpoiledBallots(nz(req.getSpoiledBallots()));
        // ✅ NEW
        s.setUnusedBallots(nz(req.getUnusedBallots()));

        if (req.getUnusedBallots() != null)
            s.setUnusedBallots(req.getUnusedBallots()); // ✅ add this

        s.setStatus(VoteStatus.PENDING);
        s.setComments(req.getComments());

        s.setClientIp(req.getClientIp());
        s.setUserAgent(req.getUserAgent());

        s.setIdempotencyKey(req.getIdempotencyKey());

        return s;
    }

    public void apply(VoteSubmissionUpdateRequest req, VoteSubmission s) {
        if (req.getCandidateVotes() != null) s.setCandidateVotes(req.getCandidateVotes());
        if (req.getBallotsInBox() != null) s.setBallotsInBox(req.getBallotsInBox());
        if (req.getInvalidBallots() != null) s.setInvalidBallots(req.getInvalidBallots());
        if (req.getUnmarkedBallots() != null) s.setUnmarkedBallots(req.getUnmarkedBallots());
        if (req.getRejectedBallots() != null) s.setRejectedBallots(req.getRejectedBallots());
        if (req.getSpoiledBallots() != null) s.setSpoiledBallots(req.getSpoiledBallots());
        if (req.getUnusedBallots() != null) s.setUnusedBallots(req.getUnusedBallots());

        if (req.getComments() != null) s.setComments(req.getComments());
        if (req.getLatitude() != null && req.getLongitude() != null)
            s.setGpsLocation(point(req.getLongitude(), req.getLatitude()));
    }

    private static Point point(double lon, double lat) {
        Point p = GF.createPoint(new Coordinate(lon, lat));
        p.setSRID(4326);
        return p;
    }

    private static int nz(Integer x) {
        return x == null ? 0 : x;
    }





}
