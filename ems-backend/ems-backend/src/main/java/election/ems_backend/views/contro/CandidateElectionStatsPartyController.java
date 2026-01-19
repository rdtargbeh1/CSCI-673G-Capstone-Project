package election.ems_backend.views.contro;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.dto.CandidateElectionStatsPartyDto;
import election.ems_backend.views.service.CandidateElectionStatsPartyService;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Controller exposing candidate-level election stats from v_candidate_election_stats_party.
 * Endpoint: GET /api/stats/party/candidates/elections
 */
@RestController
@RequestMapping("/api/stats/party/candidates/elections")
@RequiredArgsConstructor
@Validated
public class CandidateElectionStatsPartyController {

    private static final Logger log = LoggerFactory.getLogger(CandidateElectionStatsPartyController.class);

    private final CandidateElectionStatsPartyService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 500;
    private static final int DEFAULT_PAGE_SIZE = 20;

    @GetMapping
    public ResponseEntity<Page<CandidateElectionStatsPartyDto>> list(
            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "candidateId", required = false) UUID candidateId,
            @RequestParam(value = "partyId", required = false) UUID partyId,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        UUID effectiveOrgId = orgIdParam;
        if (derivedOrgId != null) {
            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam)) {
                return ResponseEntity.status(403).build();
            }
            effectiveOrgId = derivedOrgId;
        } else {
            if (effectiveOrgId == null) return ResponseEntity.badRequest().build();
        }

        int requestedSize = size == null ? DEFAULT_PAGE_SIZE : size;
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = Sort.unsorted();
        if (sort != null && sort.length > 0) {
            Sort.Order[] orders = new Sort.Order[sort.length];
            for (int i = 0; i < sort.length; i++) {
                String s = sort[i];
                String[] parts = s.split(",");
                if (parts.length == 1) {
                    orders[i] = Sort.Order.asc(parts[0].trim());
                } else {
                    orders[i] = new Sort.Order(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
                }
            }
            sortObj = Sort.by(orders);
        }

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug("Controller list candidate election stats orgId={} electionId={} candidateId={} partyId={} page={} size={} sort={}",
                effectiveOrgId, electionId, candidateId, partyId, page, pageSize, sortObj);

        meterRegistry.counter("api.stats.candidate_election.controller.requests", "endpoint", "/api/stats/party/candidates/elections").increment();

        Page<CandidateElectionStatsPartyDto> result = service.listCandidateElectionStats(effectiveOrgId, electionId, candidateId, partyId, pageable);
        return ResponseEntity.ok(result);
    }
}