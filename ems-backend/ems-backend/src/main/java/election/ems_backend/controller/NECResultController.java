package election.ems_backend.controller;

import election.ems_backend.dto.*;
import election.ems_backend.nec.NecResultPublishRequest;
import election.ems_backend.service.NECResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/nec-results")
@RequiredArgsConstructor
public class NECResultController {

    private final NECResultService service;


    @PostMapping("/publish")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    public void publish(@RequestParam UUID electionId,
                        @RequestParam UUID contestId,
                        @RequestParam UUID centerId,
                        @RequestBody @Valid NecResultPublishRequest req) {
        service.publishForCenterContest(electionId, contestId, centerId, req);
    }

    @PostMapping("/unpublish")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN')")
    public void unpublish(@RequestParam UUID electionId,
                          @RequestParam UUID contestId,
                          @RequestParam UUID centerId,
                          @RequestParam UUID actorUserId,
                          @RequestParam(required = false) String reason) {
        service.unpublishForCenterContest(electionId, contestId, centerId, actorUserId, reason);
    }


    @GetMapping("/published")
    @ResponseStatus(HttpStatus.OK)
    @PreAuthorize("hasAnyRole('SYSTEM_ADMIN','NEC_ADMIN','TENANT_ADMIN','TENANT_USER','PARTY_ADMIN','PARTY_USER','OBSERVER')")
    public Map<String, Boolean> published(@RequestParam UUID electionId,
                                          @RequestParam(required = false) UUID contestId) {
        boolean published = service.isElectionPublished(electionId, contestId);
        return Map.of("published", published);
    }

    @GetMapping("/{id}")
    public NECResultDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping
    public Page<NECResultDto> search(
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime uploadedAfter,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime uploadedBefore,
            @PageableDefault(size = 20, sort = "uploadTime", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.search(electionId, centerId, uploadedAfter, uploadedBefore, pageable);
    }

    // ----- Stats / Rollups -----

    @GetMapping("/stats/totals")
    public NECOverallTotalsDto totals(@RequestParam UUID electionId,
                                      @RequestParam(required = false) UUID centerId) {
        return service.totals(electionId, centerId);
    }

    @GetMapping("/stats/by-candidate")
    public List<CandidateVoteTotalDto> byCandidate(@RequestParam UUID electionId,
                                                   @RequestParam(required = false) UUID centerId) {
        return service.totalsByCandidate(electionId, centerId);
    }

    @GetMapping("/stats/by-county")
    public List<CandidateScopedTotalDto> byCounty(@RequestParam UUID electionId) {
        return service.byCountyPerCandidate(electionId);
    }

    @GetMapping("/stats/by-district")
    public List<CandidateScopedTotalDto> byDistrict(@RequestParam UUID electionId,
                                                    @RequestParam(required = false) UUID countyId) {
        return service.byDistrictPerCandidate(electionId, countyId);
    }

    @GetMapping("/stats/daily")
    public List<CandidateDailyTotalDto> daily(@RequestParam UUID electionId) {
        return service.dailyByCandidate(electionId);
    }


}