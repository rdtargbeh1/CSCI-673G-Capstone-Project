package election.ems_backend.views.contro;

import election.ems_backend.tenant.OrgContext;
import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.dto.CandidateCountyStatsPartyDto;
import election.ems_backend.views.service.CandidateCountyStatsPartyService;
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
 * Controller exposing candidate-level county stats from v_candidate_county_stats_party.
 * Endpoint: GET /api/stats/party/candidates/counties
 */
@RestController
@RequestMapping("/api/stats/party/candidates/counties")
@RequiredArgsConstructor
@Validated
public class CandidateCountyStatsPartyController {


    private static final Logger log = LoggerFactory.getLogger(CandidateCountyStatsPartyController.class);

    private final CandidateCountyStatsPartyService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 500;
    private static final int DEFAULT_PAGE_SIZE = 20;

    @GetMapping
    public ResponseEntity<Page<CandidateCountyStatsPartyDto>> list(
            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId, // ✅ OPTIONAL
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "candidateId", required = false) UUID candidateId,
            @RequestParam(value = "partyId", required = false) UUID partyId,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();
        // ❌ contestId null is now allowed

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        if (derivedOrgId == null) derivedOrgId = OrgContext.get();

        UUID effectiveOrgId = orgIdParam;
        if (derivedOrgId != null) {
            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam))
                return ResponseEntity.status(403).build();
            effectiveOrgId = derivedOrgId;
        } else {
            if (effectiveOrgId == null) return ResponseEntity.badRequest().build();
        }

        int requestedSize = (size == null ? DEFAULT_PAGE_SIZE : size);
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = Sort.unsorted();
        if (sort != null && sort.length > 0) {
            Sort.Order[] orders = new Sort.Order[sort.length];
            for (int i = 0; i < sort.length; i++) {
                String[] parts = sort[i].split(",");
                orders[i] = (parts.length == 1)
                        ? Sort.Order.asc(parts[0].trim())
                        : new Sort.Order(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
            }
            sortObj = Sort.by(orders);
        }

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        Page<CandidateCountyStatsPartyDto> result =
                service.listCandidateCountyStats(
                        effectiveOrgId,
                        electionId,
                        contestId,   // ✅ nullable
                        countyId,
                        candidateId,
                        partyId,
                        pageable
                );

        return ResponseEntity.ok(result);
    }


}