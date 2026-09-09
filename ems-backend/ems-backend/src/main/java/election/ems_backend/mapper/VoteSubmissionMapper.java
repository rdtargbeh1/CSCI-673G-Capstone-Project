package election.ems_backend.mapper;

import com.fasterxml.jackson.databind.ObjectMapper;
import election.ems_backend.dto.VoteSubmissionCreateRequest;
import election.ems_backend.dto.VoteSubmissionDto;
import election.ems_backend.dto.VoteSubmissionUpdateRequest;
import election.ems_backend.entity.Contest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingPlace;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.VoteSubmission;
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

    private static final GeometryFactory GF =
            new GeometryFactory(
                    new PrecisionModel(),
                    4326
            );

    private final ObjectMapper objectMapper =
            new ObjectMapper();

    // =========================================================================
    // ENTITY -> DTO
    // =========================================================================

    public VoteSubmissionDto toDTO(
            VoteSubmission submission
    ) {

        Organization organization =
                submission.getOrganization();

        Election election =
                submission.getElection();

        PollingPlace pollingPlace =
                submission.getPollingPlace();

        PollingCenter pollingCenter =
                submission.getPollingCenter();

        SystemUser agent =
                submission.getAgent();

        SystemUser verifier =
                submission.getVerifiedBy();

        SystemUser flaggedBy =
                submission.getFlaggedBy();

        Contest contest =
                submission.getContest();

        // =====================================================================
        // GPS
        // =====================================================================

        Double latitude = null;
        Double longitude = null;

        if (submission.getGpsLocation() != null) {
            longitude =
                    submission
                            .getGpsLocation()
                            .getX();

            latitude =
                    submission
                            .getGpsLocation()
                            .getY();
        }

        // =====================================================================
        // USER NAMES
        // =====================================================================

        String agentName =
                buildUserName(agent);

        String verifiedByName =
                buildUserName(verifier);

        String flaggedByName =
                buildUserName(flaggedBy);

        // =====================================================================
        // CANDIDATE VOTES
        // =====================================================================

        Map<String, Integer> votesMap =
                submission.getCandidateVotes() != null
                        ? submission.getCandidateVotes()
                        : Collections.emptyMap();

        int validVotes =
                votesMap
                        .values()
                        .stream()
                        .mapToInt(VoteSubmissionMapper::nz)
                        .sum();

        // =====================================================================
        // INVALID VOTES INSIDE BOX
        // =====================================================================
        //
        // IMPORTANT:
        //
        // Spoiled ballots are OUTSIDE the ballot box.
        //
        // invalidTotal =
        //     invalid
        //   + rejected
        //   + unmarked
        //
        // =====================================================================

        int invalidTotal =
                nz(submission.getInvalidBallots())
                        + nz(submission.getRejectedBallots())
                        + nz(submission.getUnmarkedBallots());

        // =====================================================================
        // BALLOTS IN BOX
        // =====================================================================

        int ballotsInBox =
                nz(submission.getBallotsInBox());

        // =====================================================================
        // PERCENTAGES
        // =====================================================================

        Double validPct =
                ballotsInBox > 0
                        ? (validVotes * 100.0) / ballotsInBox
                        : null;

        Double invalidPct =
                ballotsInBox > 0
                        ? (invalidTotal * 100.0) / ballotsInBox
                        : null;

        // Turnout is calculated later from allocation context when available.
        // Mapper leaves it null here.
        Double turnoutPct = null;

        // =====================================================================
        // CANDIDATE VOTES JSON
        // =====================================================================

        String candidateVotesJson;

        try {
            candidateVotesJson =
                    objectMapper.writeValueAsString(
                            votesMap
                    );
        } catch (Exception ex) {
            candidateVotesJson = "{}";
        }

        // =====================================================================
        // BUILD DTO
        // =====================================================================

        return VoteSubmissionDto
                .builder()

                // -------------------------------------------------------------
                // ID
                // -------------------------------------------------------------

                .submissionId(
                        submission.getSubmissionId()
                )

                // -------------------------------------------------------------
                // ORGANIZATION
                // -------------------------------------------------------------

                .orgId(
                        organization != null
                                ? organization.getOrgId()
                                : null
                )

                .orgName(
                        organization != null
                                ? organization.getOrgName()
                                : null
                )

                // -------------------------------------------------------------
                // ELECTION
                // -------------------------------------------------------------

                .electionId(
                        election != null
                                ? election.getElectionId()
                                : null
                )

                .electionName(
                        election != null
                                ? election.getElectionName()
                                : null
                )

                .year(
                        election != null
                                ? election.getYear()
                                : 0
                )

                // -------------------------------------------------------------
                // CONTEST
                // -------------------------------------------------------------

                .contestId(
                        submission.getContestId()
                )

                .contestName(
                        contest != null
                                ? contest.getContestName()
                                : null
                )

                .contestCategory(
                        contest != null
                                && contest.getCategory() != null
                                ? contest
                                .getCategory()
                                .name()
                                : null
                )

                .contestScopeType(
                        contest != null
                                && contest.getScopeType() != null
                                ? contest
                                .getScopeType()
                                .name()
                                : null
                )

                // -------------------------------------------------------------
                // POLLING CENTER
                // -------------------------------------------------------------

                .centerId(
                        pollingCenter != null
                                ? pollingCenter.getCenterId()
                                : null
                )

                .centerCode(
                        pollingCenter != null
                                ? pollingCenter.getCode()
                                : null
                )

                .centerName(
                        pollingCenter != null
                                ? pollingCenter.getCenterName()
                                : null
                )

                // -------------------------------------------------------------
                // POLLING PLACE
                // -------------------------------------------------------------

                .placeId(
                        pollingPlace != null
                                ? pollingPlace.getPlaceId()
                                : null
                )

                .placeCode(
                        pollingPlace != null
                                ? pollingPlace.getCode()
                                : null
                )

                .placeNumber(
                        pollingPlace != null
                                ? pollingPlace.getPlaceNumber()
                                : null
                )

                .placeLabel(
                        pollingPlace != null
                                ? pollingPlace.getLabel()
                                : null
                )

                // -------------------------------------------------------------
                // AGENT / SUBMITTER
                // -------------------------------------------------------------

                .agentId(
                        agent != null
                                ? agent.getUserId()
                                : null
                )

                .agentName(
                        agentName
                )

                // -------------------------------------------------------------
                // SUBMISSION TIME
                // -------------------------------------------------------------

                .submissionTime(
                        submission.getSubmissionTime()
                )

                // -------------------------------------------------------------
                // VOTE DATA
                // -------------------------------------------------------------

                .candidateVotesJson(
                        candidateVotesJson
                )

                .candidateVotes(
                        votesMap
                )

                .validVotes(
                        validVotes
                )

                .invalidTotal(
                        invalidTotal
                )

                // -------------------------------------------------------------
                // BALLOT DATA
                // -------------------------------------------------------------

                .ballotsInBox(
                        submission.getBallotsInBox()
                )

                .ballotsReceived(
                        submission.getBallotsReceived()
                )

                .invalidBallots(
                        submission.getInvalidBallots()
                )

                .unmarkedBallots(
                        submission.getUnmarkedBallots()
                )

                .rejectedBallots(
                        submission.getRejectedBallots()
                )

                .spoiledBallots(
                        submission.getSpoiledBallots()
                )

                .unusedBallots(
                        submission.getUnusedBallots()
                )

                // -------------------------------------------------------------
                // STATUS / COMMENTS
                // -------------------------------------------------------------

                .status(
                        submission.getStatus()
                )

                .comments(
                        submission.getComments()
                )

                // -------------------------------------------------------------
                // FLAGGING
                // -------------------------------------------------------------

                .flaggedBy(
                        flaggedBy != null
                                ? flaggedBy.getUserId()
                                : null
                )

                .flaggedByName(
                        flaggedByName
                )

                .dateFlagged(
                        submission.getDateFlagged()
                )

                // -------------------------------------------------------------
                // GPS
                // -------------------------------------------------------------

                .latitude(
                        latitude
                )

                .longitude(
                        longitude
                )

                // -------------------------------------------------------------
                // VERIFICATION
                // -------------------------------------------------------------

                .verifiedBy(
                        verifier != null
                                ? verifier.getUserId()
                                : null
                )

                .verifiedByName(
                        verifiedByName
                )

                .dateVerified(
                        submission.getDateVerified()
                )

                // -------------------------------------------------------------
                // REQUEST / DEVICE
                // -------------------------------------------------------------

                .clientIp(
                        submission.getClientIp()
                )

                .userAgent(
                        submission.getUserAgent()
                )

                // -------------------------------------------------------------
                // INTEGRITY
                // -------------------------------------------------------------

                .submissionHash(
                        submission.getSubmissionHash()
                )

                .chainHash(
                        submission.getChainHash()
                )

                .submissionSignature(
                        submission.getSubmissionSignature()
                )

                .submissionSignerKeyId(
                        submission.getSubmissionSignerKeyId()
                )

                .idempotencyKey(
                        submission.getIdempotencyKey()
                )

                // -------------------------------------------------------------
                // VERSION
                // -------------------------------------------------------------

                .version(
                        submission.getVersion()
                )

                // -------------------------------------------------------------
                // AUDIT DATES
                // -------------------------------------------------------------

                .dateCreated(
                        submission.getDateCreated()
                )

                .dateUpdated(
                        submission.getDateUpdated()
                )

                .dateDeleted(
                        submission.getDateDeleted()
                )

                // -------------------------------------------------------------
                // DERIVED PERCENTAGES
                // -------------------------------------------------------------

                .validPct(
                        validPct
                )

                .invalidPct(
                        invalidPct
                )

                .turnoutPct(
                        turnoutPct
                )

                // -------------------------------------------------------------
                // DISCREPANCY
                // -------------------------------------------------------------

                .hasDiscrepancy(
                        submission.getHasDiscrepancies()
                )

                // -------------------------------------------------------------
                // EVIDENCE
                //
                // Populated later by service.get(...)
                // -------------------------------------------------------------

                .tallySheetCount(0)
                .hasTallySheet(false)
                .tallySheetUrl(null)

                .build();
    }

    // =========================================================================
    // CREATE REQUEST -> ENTITY
    // =========================================================================

    public VoteSubmission toEntity(
            VoteSubmissionCreateRequest req,
            Organization organization,
            Election election,
            PollingCenter pollingCenter,
            SystemUser agent
    ) {

        VoteSubmission submission =
                new VoteSubmission();

        submission.setOrganization(
                organization
        );

        submission.setElection(
                election
        );

        submission.setPollingCenter(
                pollingCenter
        );

        submission.setAgent(
                agent
        );

        submission.setContestId(
                req.getContestId()
        );

        submission.setCandidateVotes(
                req.getCandidateVotes()
        );

        submission.setBallotsReceived(
                nz(req.getBallotsReceived())
        );

        submission.setBallotsInBox(
                nz(req.getBallotsInBox())
        );

        submission.setInvalidBallots(
                nz(req.getInvalidBallots())
        );

        submission.setUnmarkedBallots(
                nz(req.getUnmarkedBallots())
        );

        submission.setRejectedBallots(
                nz(req.getRejectedBallots())
        );

        submission.setSpoiledBallots(
                nz(req.getSpoiledBallots())
        );

        submission.setUnusedBallots(
                nz(req.getUnusedBallots())
        );

        submission.setStatus(
                VoteStatus.PENDING
        );

        submission.setComments(
                req.getComments()
        );

        submission.setClientIp(
                req.getClientIp()
        );

        submission.setUserAgent(
                req.getUserAgent()
        );

        submission.setIdempotencyKey(
                req.getIdempotencyKey()
        );

        return submission;
    }

    // =========================================================================
    // UPDATE REQUEST -> ENTITY
    // =========================================================================

    public void apply(
            VoteSubmissionUpdateRequest req,
            VoteSubmission submission
    ) {

        if (req.getCandidateVotes() != null) {
            submission.setCandidateVotes(
                    req.getCandidateVotes()
            );
        }

        if (req.getBallotsReceived() != null) {
            submission.setBallotsReceived(
                    req.getBallotsReceived()
            );
        }

        if (req.getBallotsInBox() != null) {
            submission.setBallotsInBox(
                    req.getBallotsInBox()
            );
        }

        if (req.getInvalidBallots() != null) {
            submission.setInvalidBallots(
                    req.getInvalidBallots()
            );
        }

        if (req.getUnmarkedBallots() != null) {
            submission.setUnmarkedBallots(
                    req.getUnmarkedBallots()
            );
        }

        if (req.getRejectedBallots() != null) {
            submission.setRejectedBallots(
                    req.getRejectedBallots()
            );
        }

        if (req.getSpoiledBallots() != null) {
            submission.setSpoiledBallots(
                    req.getSpoiledBallots()
            );
        }

        if (req.getUnusedBallots() != null) {
            submission.setUnusedBallots(
                    req.getUnusedBallots()
            );
        }

        if (req.getComments() != null) {
            submission.setComments(
                    req.getComments()
            );
        }

        if (
                req.getLatitude() != null
                        && req.getLongitude() != null
        ) {

            submission.setGpsLocation(
                    point(
                            req.getLongitude(),
                            req.getLatitude()
                    )
            );
        }
    }

    // =========================================================================
    // HELPERS
    // =========================================================================

    private static String buildUserName(
            SystemUser user
    ) {

        if (user == null) {
            return null;
        }

        String firstName =
                user.getFirstName() != null
                        ? user.getFirstName().trim()
                        : "";

        String lastName =
                user.getLastName() != null
                        ? user.getLastName().trim()
                        : "";

        String name =
                (
                        firstName
                                + " "
                                + lastName
                ).trim();

        return name.isBlank()
                ? null
                : name;
    }

    private static Point point(
            double longitude,
            double latitude
    ) {

        Point point =
                GF.createPoint(
                        new Coordinate(
                                longitude,
                                latitude
                        )
                );

        point.setSRID(
                4326
        );

        return point;
    }

    private static int nz(
            Integer value
    ) {

        return value == null
                ? 0
                : value;
    }
}