package election.ems_backend.views.contro;

import election.ems_backend.views.dto.CandidateCenterStatsOfficialDto;
import election.ems_backend.views.service.CandidateCenterStatsOfficialService;
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
 * Controller exposing NEC official candidate-level per-center stats.
 * Endpoint: GET /api/stats/official/candidates/centers
 */
@RestController
@RequestMapping("/api/stats/official/candidates/centers")
@RequiredArgsConstructor
@Validated
public class CandidateCenterStatsOfficialController {

    private static final Logger log = LoggerFactory.getLogger(CandidateCenterStatsOfficialController.class);

    private final CandidateCenterStatsOfficialService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 500;
    private static final int DEFAULT_PAGE_SIZE = 20;

    @GetMapping
    public ResponseEntity<Page<CandidateCenterStatsOfficialDto>> list(
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId,  // ✅ OPTIONAL NOW
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "districtId", required = false) UUID districtId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            @RequestParam(value = "candidateId", required = false) UUID candidateId,
            @RequestParam(value = "partyId", required = false) UUID partyId,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build(); // ✅ contestId no longer required

        int requestedSize = size == null ? DEFAULT_PAGE_SIZE : size;
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = Sort.unsorted();
        if (sort != null && sort.length > 0) {
            Sort.Order[] orders = new Sort.Order[sort.length];
            for (int i = 0; i < sort.length; i++) {
                String[] parts = sort[i].split(",");
                if (parts.length == 1) {
                    orders[i] = Sort.Order.asc(parts[0].trim());
                } else {
                    orders[i] = new Sort.Order(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
                }
            }
            sortObj = Sort.by(orders);
        }

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug(
                "Controller list official candidate center stats electionId={} contestId={} countyId={} districtId={} centerId={} candidateId={} partyId={} page={} size={} sort={}",
                electionId, contestId, countyId, districtId, centerId, candidateId, partyId, page, pageSize, sortObj
        );

        meterRegistry.counter(
                "api.stats.official.candidate_center.controller.requests",
                "endpoint", "/api/stats/official/candidates/centers"
        ).increment();

        Page<CandidateCenterStatsOfficialDto> result =
                service.listCandidateCenterOfficialStats(
                        electionId,
                        contestId,     // ✅ nullable
                        countyId,
                        districtId,
                        centerId,
                        candidateId,
                        partyId,
                        pageable
                );

        return ResponseEntity.ok(result);
    }

}