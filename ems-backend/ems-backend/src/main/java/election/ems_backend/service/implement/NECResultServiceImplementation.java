package election.ems_backend.service.implement;

import election.ems_backend.dto.*;
import election.ems_backend.entity.NECResult;
import election.ems_backend.mapper.NECResultMapper;
import election.ems_backend.repository.*;
import election.ems_backend.service.NECResultService;
import election.ems_backend.utility.NECResultSpecs;
import election.ems_backend.views.repo.NecResultGeoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;

import static org.springframework.http.HttpStatus.*;

@Service
@RequiredArgsConstructor
public class NECResultServiceImplementation implements NECResultService {

    @Autowired
    private NECResultRepository resultRepo;
    @Autowired
    private ElectionRepository electionRepo;
    @Autowired
    private ContestRepository contestRepository;
    @Autowired
    private PollingCenterRepository centerRepo;
    @Autowired
    private NecResultGeoRepository necResultGeoRepository;
    @Autowired
    private PollingCenterAllocationRepository allocationRepo;
    private final NECResultMapper mapper = new NECResultMapper();


    // ----------------- CREATE -----------------

    @Override
    public NECResultDto create(NECResultCreateRequest req) {
        var election = electionRepo.findById(req.getElectionId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Election not found"));

        // ✅ NEW: contest required
        var contest = contestRepository.findById(req.getContestId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Contest not found"));

        var center = centerRepo.findById(req.getCenterId())
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Polling center not found"));

        var allocation = allocationRepo
                .findByElection_ElectionIdAndPollingCenter_CenterId(election.getElectionId(), center.getCenterId())
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Center is not allocated for this election"));

        // ✅ NEW: contest-aware uniqueness
        if (resultRepo.existsByElection_ElectionIdAndContest_ContestIdAndPollingCenter_CenterId(
                election.getElectionId(), contest.getContestId(), center.getCenterId())) {
            throw new ResponseStatusException(CONFLICT, "Result already exists for this election, contest & center");
        }

        // ✅ UPDATED: request uses ballotsInBox, DB uses ballots_cast
        // ✅ UPDATED: include unusedBallots (not part of invalids)
        validateTally(
                req.getCandidateVotes(),
                nz(req.getInvalidBallots()),
                nz(req.getUnmarkedBallots()),
                nz(req.getRejectedBallots()),
                nz(req.getSpoiledBallots()),
                nz(req.getUnusedBallots()),        // ✅ NEW
                nz(req.getBallotsInBox()),         // ✅ NEW (was ballotsCast)
                allocation.getRegisteredVoters(),
                allocation.getBallotsIssued()
        );

        // Persist NECResult (force authoritative registered number)
        var entity = mapper.toEntity(req, election, center);
        entity.setTotalRegisteredVoters(allocation.getRegisteredVoters());

        // ✅ NEW: set contest on entity (no mapper change required)
        entity.setContest(contest);

        var saved = resultRepo.save(entity);

        return mapper.toDTO(saved);
    }



    // ----------------- UPDATE -----------------
    @Override
    public NECResultDto update(UUID resultId, NECResultUpdateRequest req) {
        var entity = resultRepo.findById(resultId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Result not found"));

        var electionId = entity.getElection().getElectionId();
        var centerId   = entity.getPollingCenter().getCenterId();

        var allocation = allocationRepo
                .findByElection_ElectionIdAndPollingCenter_CenterId(electionId, centerId)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Center is not allocated for this election"));

        // Compute merged (post-update) values for validation
        var newVotesJson = (req.getCandidateVotes() != null) ? writeVotes(req.getCandidateVotes())
                : entity.getCandidateVotes();
        long sumVotes = sumVotesFromJson(newVotesJson);

        int newInvalid   = coalesce(req.getInvalidBallots(), entity.getInvalidBallots());
        int newBlank     = coalesce(req.getUnmarkedBallots(), entity.getUnmarkedBallots());
        int newUnused    = coalesce(req.getUnusedBallots(), entity.getUnusedBallots()); // ✅ NEW
        int newRejected  = coalesce(req.getRejectedBallots(), entity.getRejectedBallots());
        int newSpoiled   = coalesce(req.getSpoiledBallots(), entity.getSpoiledBallots());

        // ✅ UPDATED: request uses ballotsInBox; DB field is ballots_cast
        int newCast      = coalesce(req.getBallotsInBox(), entity.getBallotsInBox());

        validateTally(
                null,
                newInvalid,
                newBlank,
                newRejected,
                newSpoiled,
                newUnused,                           // ✅ NEW
                newCast,
                allocation.getRegisteredVoters(),
                allocation.getBallotsIssued(),
                sumVotes
        );

        // Apply, enforce registered voters from allocation
        mapper.apply(req, entity);
        entity.setTotalRegisteredVoters(allocation.getRegisteredVoters());

        var saved = resultRepo.save(entity);

        return mapper.toDTO(saved);
    }



    @Override
    public void delete(UUID resultId) {
        if (!resultRepo.existsById(resultId)) {
            throw new ResponseStatusException(NOT_FOUND, "Result not found");
        }
        resultRepo.deleteById(resultId);
    }

    @Override
    public NECResultDto get(UUID resultId) {
        return resultRepo.findById(resultId)
                .map(mapper::toDTO)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Result not found"));
    }

    @Override
    public Page<NECResultDto> search(UUID electionId, UUID centerId,
                                     LocalDateTime uploadedAfter, LocalDateTime uploadedBefore,
                                     Pageable pageable) {
        Specification<NECResult> spec = Specification
                .where(NECResultSpecs.electionEquals(electionId))
                .and(NECResultSpecs.centerEquals(centerId))
                .and(NECResultSpecs.uploadedAfter(uploadedAfter))
                .and(NECResultSpecs.uploadedBefore(uploadedBefore));

        return resultRepo.findAll(spec, pageable).map(mapper::toDTO);
    }


    // ---------- Rollups / Totals ----------

    @Override
    public NECOverallTotalsDto totals(UUID electionId, UUID centerId) {
        requireElection(electionId);
        Map<String, Object> scalars = resultRepo.sumScalarColumns(electionId, centerId);
        BigInteger candSum = resultRepo.sumAllCandidateVotes(electionId, centerId);

        long ballotsInBox     = toLong(scalars.get("ballots_cast"));
        long invalidBallots  = toLong(scalars.get("invalid_ballots"));
        long blankBallots    = toLong(scalars.get("blank_ballots"));
        long rejectedBallots = toLong(scalars.get("rejected_ballots"));
        long spoiledBallots  = toLong(scalars.get("spoiled_ballots"));
        long totalCandVotes  = candSum == null ? 0L : candSum.longValue();
        long registeredVoters= toLong(scalars.get("registered_voters")); // available if you want to surface

        return NECOverallTotalsDto.builder()
                .totalCandidateVotes(totalCandVotes)
                .ballotsCast(ballotsInBox)
                .invalidBallots(invalidBallots)
                .blankBallots(blankBallots)
                .rejectedBallots(rejectedBallots)
                .spoiledBallots(spoiledBallots)
                .build();
    }



    @Override
    public List<CandidateVoteTotalDto> totalsByCandidate(UUID electionId, UUID centerId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.overallByCandidate(electionId, centerId);
        List<CandidateVoteTotalDto> out = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            out.add(new CandidateVoteTotalDto((UUID) r[0], toLong(r[1])));
        }
        return out;
    }


    @Override
    public List<CandidateScopedTotalDto> byCountyPerCandidate(UUID electionId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.byCountyPerCandidate(electionId);

        Map<UUID, List<CandidateScopedTotalDto>> perCounty = new LinkedHashMap<>();
        Map<UUID, Long> countyRegistered = new HashMap<>();

        for (Object[] r : rows) {
            UUID countyId     = (UUID) r[0];
            String countyName = (String) r[1];
            UUID candidateId  = (UUID) r[2];
            long votes        = toLong(r[3]);
            long registered   = toLong(r[4]); // NEW

            perCounty.computeIfAbsent(countyId, k -> new ArrayList<>())
                    .add(new CandidateScopedTotalDto(candidateId, countyId, countyName, votes, 0,0,0,0,0, registered, 0.0));
            countyRegistered.merge(countyId, registered, Long::sum);
        }

        // compute pct per county using registered voters (fallback to vote-sum if registered is 0)
        perCounty.forEach((countyId, list) -> {
            long reg = countyRegistered.getOrDefault(countyId, 0L);
            double denom = reg > 0 ? reg : Math.max(1L, list.stream().mapToLong(CandidateScopedTotalDto::getVotes).sum());
            list.forEach(x -> x.setVoteSharePct(roundPct((x.getVotes() * 100.0) / denom)));
        });

        return perCounty.values().stream().flatMap(List::stream).toList();
    }



    @Override
    public List<CandidateScopedTotalDto> byDistrictPerCandidate(UUID electionId, UUID countyId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.byDistrictPerCandidate(electionId, countyId);

        Map<UUID, List<CandidateScopedTotalDto>> perDistrict = new LinkedHashMap<>();
        Map<UUID, Long> districtRegistered = new HashMap<>();

        for (Object[] r : rows) {
            UUID districtId   = (UUID) r[0];
            String name       = (String) r[1];
            UUID candidateId  = (UUID) r[2];
            long votes        = toLong(r[3]);
            long registered   = toLong(r[4]); // NEW

            perDistrict.computeIfAbsent(districtId, k -> new ArrayList<>())
                    .add(new CandidateScopedTotalDto(candidateId, districtId, name, votes, 0,0,0,0,0, registered, 0.0));
            districtRegistered.merge(districtId, registered, Long::sum);
        }

        perDistrict.forEach((distId, list) -> {
            long reg = districtRegistered.getOrDefault(distId, 0L);
            double denom = reg > 0 ? reg : Math.max(1L, list.stream().mapToLong(CandidateScopedTotalDto::getVotes).sum());
            list.forEach(x -> x.setVoteSharePct(roundPct((x.getVotes() * 100.0) / denom)));
        });

        return perDistrict.values().stream().flatMap(List::stream).toList();
    }


    @Override
    public List<CandidateDailyTotalDto> dailyByCandidate(UUID electionId) {
        requireElection(electionId);
        List<Object[]> rows = resultRepo.dailyByCandidate(electionId);

        Map<LocalDate, List<CandidateDailyTotalDto>> perDay = new LinkedHashMap<>();
        Map<LocalDate, Long> dayRegistered = new HashMap<>();

        for (Object[] r : rows) {
            LocalDate day    = ((java.sql.Date) r[0]).toLocalDate();
            UUID candidateId = (UUID) r[1];
            long votes       = toLong(r[2]);
            long ballotsCast = (r.length > 3) ? toLong(r[3]) : 0L;
            long registered  = (r.length > 4) ? toLong(r[4]) : 0L; // NEW

            perDay.computeIfAbsent(day, k -> new ArrayList<>())
                    .add(new CandidateDailyTotalDto(candidateId, day, votes, ballotsCast, registered, 0.0));
            dayRegistered.merge(day, registered, Long::sum);
        }

        perDay.forEach((day, list) -> {
            long reg = dayRegistered.getOrDefault(day, 0L);
            double denom = reg > 0 ? reg : Math.max(1L, list.stream().mapToLong(CandidateDailyTotalDto::getVotes).sum());
            list.forEach(it -> it.setVoteSharePct(roundPct((it.getVotes() * 100.0) / denom)));
        });

        return perDay.values().stream().flatMap(List::stream).toList();
    }



    // --- helpers ---
    private void requireElection(UUID id) {
        if (id == null) throw new ResponseStatusException(BAD_REQUEST, "electionId is required");
    }
    private long toLong(Object x) {
        if (x == null) return 0L;
        if (x instanceof Number n) return n.longValue();
        return Long.parseLong(String.valueOf(x));
    }
    private double roundPct(double v) { return Math.round(v * 100.0) / 100.0; }
    private void applyVoteShare(Collection<List<CandidateScopedTotalDto>> groups) {
        for (var list : groups) {
            long total = list.stream().mapToLong(CandidateScopedTotalDto::getVotes).sum();
            double denom = total == 0 ? 1.0 : total;
            list.forEach(it -> it.setVoteSharePct(roundPct(it.getVotes() * 100.0 / denom)));
        }
    }


    // ----------------- LOCAL UTILS -----------------
    private int nz(Integer x) { return x == null ? 0 : x; }
    private int coalesce(Integer a, Integer b) { return a != null ? a : (b == null ? 0 : b); }

    // re-use the same JSON shape as mapper: { "candidateId": number, ... }
    private static final com.fasterxml.jackson.databind.ObjectMapper OM = new com.fasterxml.jackson.databind.ObjectMapper();

    private long sumVotesFromJson(String json) {
        if (json == null || json.isBlank()) return 0L;
        try {
            Map<java.util.UUID, Integer> m = OM.readValue(
                    json, new com.fasterxml.jackson.core.type.TypeReference<Map<java.util.UUID, Integer>>() {});
            return m.values().stream().mapToLong(Integer::longValue).sum();
        } catch (Exception e) {
            throw new ResponseStatusException(BAD_REQUEST, "Invalid candidateVotes JSON", e);
        }
    }
    private String writeVotes(Map<UUID,Integer> m) {
        try { return OM.writeValueAsString(m == null ? java.util.Collections.emptyMap() : m); }
        catch (Exception e) { throw new ResponseStatusException(BAD_REQUEST, "Invalid candidateVotes", e); }
    }


    // ----------------- VALIDATION HELPERS -----------------
    /** Create: sum votes from request map; Update: provide sumVotesOverride */
    private void validateTally(Map<UUID,Integer> votesMap,
                               int invalid, int unmarked, int rejected, int spoiled,
                               int unused,            // ✅ NEW
                               int ballotsInBox, int registered, Integer ballotsIssued) {
        long sumVotes = (votesMap == null) ? 0L : votesMap.values().stream().mapToLong(Integer::longValue).sum();
        validateTallyInternal(sumVotes, invalid, unmarked, rejected, spoiled, unused, ballotsInBox, registered, ballotsIssued);
    }

    private void validateTally(Map<UUID,Integer> votesMap,
                               int invalid, int unmarked, int rejected, int spoiled,
                               int unused,            // ✅ NEW
                               int ballotsInBox, int registered, Integer ballotsIssued, long sumVotesOverride) {
        long sumVotes = (votesMap == null) ? sumVotesOverride
                : votesMap.values().stream().mapToLong(Integer::longValue).sum();
        validateTallyInternal(sumVotes, invalid, unmarked, rejected, spoiled, unused, ballotsInBox, registered, ballotsIssued);
    }


    /**
     * Core integrity checks for a polling center tally.
     *
     * @param sumVotes        Sum of all candidate votes (already computed)
     * @param invalid         Count of invalid ballots
     * @param unmarked           Count of unmarked ballots
     * @param rejected        Count of rejected ballots
     * @param spoiled         Count of spoiled ballots
     * @param ballotsInBox            Total ballots cast at the center
     * @param registered      Total registered voters (authoritative, from allocation)
     * @param ballotsIssued   (Optional) ballots issued to the center for the election; may be null
     *
     * @throws ResponseStatusException BAD_REQUEST when any consistency rule is violated
     */
    private void validateTallyInternal(long sumVotes,
                                       int invalid,
                                       int unmarked,
                                       int rejected,
                                       int spoiled,
                                       int unused,         // ✅ NEW
                                       int ballotsInBox,
                                       int registered,
                                       Integer ballotsIssued) {

        // ---- Basic domain sanity ----
        if (ballotsInBox < 0 || registered < 0) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Negative counts are not allowed: cast=" + ballotsInBox + ", registered=" + registered);
        }

        if (invalid < 0 || unmarked < 0 || rejected < 0 || spoiled < 0 || unused < 0) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "Negative category count (invalid/unmarked/rejected/spoiled/unused) is not allowed: " +
                            "invalid=" + invalid + ", unmarked=" + unmarked + ", rejected=" + rejected +
                            ", spoiled=" + spoiled + ", unused=" + unused);
        }
        if (ballotsIssued != null && ballotsIssued < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "Negative ballotsIssued is not allowed: " + ballotsIssued);
        }
        if (sumVotes < 0) {
            throw new ResponseStatusException(BAD_REQUEST, "sumVotes cannot be negative: " + sumVotes);
        }

        // ---- Accounting check: buckets that are part of ballotsInBox must fit within 'cast' ----
        // ✅ NOTE: unused ballots are NOT part of cast, so exclude from accounted.
        long insideBox = sumVotes + (long) invalid + unmarked + rejected;
        if (insideBox != (long) ballotsInBox) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox mismatch. Expected ballotsInBox = validVotes + invalid + unmarked + rejected. " +
                            "expected=" + insideBox +
                            " (validVotes=" + sumVotes +
                            ", invalid=" + invalid +
                            ", unmarked=" + unmarked +
                            ", rejected=" + rejected +
                            "), but ballotsInBox=" + ballotsInBox
            );
        }


        // ---- Logistics check: ballotsInBox + unused cannot exceed issued (when available) ----
        long totalHandled = (long) ballotsInBox + (long) unused + (long) spoiled;
        if (ballotsIssued != null && totalHandled > ballotsIssued) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox + unusedBallots + spoiledBallots exceeds ballotsIssued. " +
                            "ballotsInBox=" + ballotsInBox +
                            ", unusedBallots=" + unused +
                            ", spoiledBallots=" + spoiled +
                            ", total=" + totalHandled +
                            ", ballotsIssued=" + ballotsIssued
            );
        }


        // ---- Registration check: turnout cannot exceed 100% ----
        if ((long) ballotsInBox > (long) registered) {
            throw new ResponseStatusException(
                    BAD_REQUEST,
                    "ballotsInBox exceeds totalRegisteredVoters. ballotsInBox=" + ballotsInBox + ", registered=" + registered
            );
        }

    }


}
