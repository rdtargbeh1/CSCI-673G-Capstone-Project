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

import java.util.ArrayList;
import java.util.List;
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
            @RequestParam(value = "contestId", required = false) UUID contestId,
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();

        int requestedSize = size == null ? DEFAULT_PAGE_SIZE : size;
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        // ✅ FIX: robust sort parsing to prevent "sort=asc" / "sort=desc" being treated as a property
        Sort sortObj = parseSort(sort);

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug("Controller list official counties electionId={} contestId={} countyId={} page={} size={} sort={}",
                electionId, contestId, countyId, page, pageSize, sortObj);

        meterRegistry.counter(
                "api.stats.official.county.controller.requests",
                "endpoint", "/api/stats/official/counties"
        ).increment();

        Page<CountyStatsOfficialDto> result =
                service.listOfficialCounties(electionId, contestId, countyId, pageable);

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ Accepts:
     *   sort=countyName,asc&sort=ballotsCast,desc
     *
     * ✅ Also tolerates buggy clients that send:
     *   sort=countyName&sort=asc
     * by ignoring stray "asc"/"desc" tokens.
     */
    private Sort parseSort(String[] sort) {
        if (sort == null || sort.length == 0) return Sort.unsorted();

        List<Sort.Order> orders = new ArrayList<>();

        for (String s : sort) {
            if (s == null) continue;

            String raw = s.trim();
            if (raw.isEmpty()) continue;

            // ✅ CRITICAL FIX: ignore stray direction tokens (buggy query like sort=asc)
            if ("asc".equalsIgnoreCase(raw) || "desc".equalsIgnoreCase(raw)) {
                continue;
            }

            String[] parts = raw.split(",", -1);
            String prop = parts[0] == null ? "" : parts[0].trim();
            if (prop.isEmpty()) continue;

            if (parts.length == 1) {
                orders.add(Sort.Order.asc(prop));
            } else {
                String dirRaw = parts[1] == null ? "" : parts[1].trim();
                Sort.Direction dir = "desc".equalsIgnoreCase(dirRaw) ? Sort.Direction.DESC : Sort.Direction.ASC;
                orders.add(new Sort.Order(dir, prop));
            }
        }

        return orders.isEmpty() ? Sort.unsorted() : Sort.by(orders);
    }


}