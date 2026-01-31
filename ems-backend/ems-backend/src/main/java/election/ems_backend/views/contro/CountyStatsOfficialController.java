package election.ems_backend.views.contro;

import election.ems_backend.views.dto.CountyStatsOfficialDto;
import election.ems_backend.views.service.CountyStatsOfficialService;
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
 * Public controller for NEC official county stats.
 * GET /api/stats/official/counties
 */
@RestController
@RequestMapping("/api/stats/official/counties")
@RequiredArgsConstructor
@Validated
public class CountyStatsOfficialController {

    private static final Logger log = LoggerFactory.getLogger(CountyStatsOfficialController.class);

    private final CountyStatsOfficialService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 500;
    private static final int DEFAULT_PAGE_SIZE = 20;

    @GetMapping
    public ResponseEntity<Page<CountyStatsOfficialDto>> list(
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId, // ✅ NEW
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();

        int requestedSize = size == null ? DEFAULT_PAGE_SIZE : size;
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = Sort.unsorted();
        if (sort != null && sort.length > 0) {
            Sort.Order[] orders = new Sort.Order[sort.length];
            for (int i = 0; i < sort.length; i++) {
                String s = sort[i];
                String[] parts = s.split(",");
                if (parts.length == 1) orders[i] = Sort.Order.asc(parts[0].trim());
                else orders[i] = new Sort.Order(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
            }
            sortObj = Sort.by(orders);
        }

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug("Controller list official counties electionId={} contestId={} countyId={} page={} size={} sort={}",
                electionId, contestId, countyId, page, pageSize, sortObj);

        meterRegistry.counter(
                "api.stats.official.county.controller.requests",
                "endpoint", "/api/stats/official/counties"
        ).increment();

        Page<CountyStatsOfficialDto> result =
                service.listOfficialCounties(electionId, contestId, countyId, pageable); // ✅ NEW

        return ResponseEntity.ok(result);
    }
}