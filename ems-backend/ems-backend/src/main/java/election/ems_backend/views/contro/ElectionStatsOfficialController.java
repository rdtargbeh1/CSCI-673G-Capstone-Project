
package election.ems_backend.views.contro;

import election.ems_backend.views.dto.ElectionStatsOfficialDto;
import election.ems_backend.views.service.ElectionStatsOfficialService;
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

import java.util.*;

/**
 * Public controller for NEC official election stats.
 * GET /api/stats/official/elections
 */
@RestController
@RequestMapping("/api/stats/official/elections")
@RequiredArgsConstructor
@Validated
public class ElectionStatsOfficialController {


    private static final Logger log = LoggerFactory.getLogger(ElectionStatsOfficialController.class);

    private final ElectionStatsOfficialService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 500;
    private static final int DEFAULT_PAGE_SIZE = 20;

    /**
     * ✅ Only allow sorting by fields that exist on the entity/view mapping.
     * Keep this aligned with ElectionStatsOfficial entity fields / columns.
     */
    private static final Set<String> ALLOWED_SORT_FIELDS = Set.of(
            // totals
            "registeredVoters",
            "ballotsCast",
            "validVotes",
            "invalidTotal",
            // pct
            "turnoutPct",
            "invalidPct",
            // reporting
            "centersReported",
            "centersTotal",
            "reportingPct",
            // progress
            "centersStarted",
            // ids (optional)
            "contestId",
            "electionId"
    );

    @GetMapping
    public ResponseEntity<Page<ElectionStatsOfficialDto>> list(
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();

        int requestedSize = (size == null ? DEFAULT_PAGE_SIZE : size);
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = parseSort(sort);

        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug("Controller list official elections electionId={} contestId={} page={} size={} sortRaw={} sortParsed={}",
                electionId, contestId, page, pageSize, Arrays.toString(sort), sortObj);

        meterRegistry.counter("api.stats.official.election.controller.requests",
                "endpoint", "/api/stats/official/elections").increment();

        Page<ElectionStatsOfficialDto> result = service.listElectionStats(electionId, contestId, pageable);

        return ResponseEntity.ok(result);
    }

    /**
     * ✅ Robust sort parser that supports BOTH:
     *   - sort=field,desc (recommended)
     *   - sort=field&sort=desc (tolerate broken clients)
     *
     * Also ignores stray "asc"/"desc" tokens and whitelists allowed fields.
     */
    private Sort parseSort(String[] sort) {
        if (sort == null || sort.length == 0) {
            // ✅ safe default (or Sort.unsorted())
            return Sort.by(
                    Sort.Order.desc("centersReported"),
                    Sort.Order.desc("reportingPct")
            );
        }

        List<Sort.Order> orders = new ArrayList<>();

        for (int i = 0; i < sort.length; i++) {
            String token = (sort[i] == null ? "" : sort[i].trim());
            if (token.isEmpty()) continue;

            // ✅ Ignore useless tokens
            if (token.equalsIgnoreCase("asc") || token.equalsIgnoreCase("desc")) {
                continue;
            }

            // Case A: "field,dir"
            if (token.contains(",")) {
                String[] parts = token.split(",");
                String field = parts.length > 0 ? parts[0].trim() : "";
                String dirRaw = parts.length > 1 ? parts[1].trim() : "asc";

                if (!isAllowed(field)) continue;

                Sort.Direction dir = safeDir(dirRaw);
                orders.add(new Sort.Order(dir, field));
                continue;
            }

            // Case B: tolerate "field" followed by "asc|desc"
            String field = token;

            if (!isAllowed(field)) {
                continue;
            }

            Sort.Direction dir = Sort.Direction.ASC;

            if (i + 1 < sort.length) {
                String next = (sort[i + 1] == null ? "" : sort[i + 1].trim());
                if (next.equalsIgnoreCase("asc") || next.equalsIgnoreCase("desc")) {
                    dir = safeDir(next);
                    i++; // consume direction token
                }
            }

            orders.add(new Sort.Order(dir, field));
        }

        if (orders.isEmpty()) {
            return Sort.by(
                    Sort.Order.desc("centersReported"),
                    Sort.Order.desc("reportingPct")
            );
        }

        return Sort.by(orders);
    }

    private boolean isAllowed(String field) {
        // allow exact match OR allow "id.contestId" style if you use embedded IDs later
        if (field == null || field.isBlank()) return false;
        return ALLOWED_SORT_FIELDS.contains(field);
    }

    private Sort.Direction safeDir(String raw) {
        if (raw == null) return Sort.Direction.ASC;
        String v = raw.trim().toLowerCase(Locale.ROOT);
        return v.equals("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
    }


//    private static final Logger log = LoggerFactory.getLogger(ElectionStatsOfficialController.class);
//
//    private final ElectionStatsOfficialService service;
//    private final MeterRegistry meterRegistry;
//
//    private static final int MAX_PAGE_SIZE = 500;
//    private static final int DEFAULT_PAGE_SIZE = 20;
//
//    @GetMapping
//    public ResponseEntity<Page<ElectionStatsOfficialDto>> list(
//            @RequestParam(value = "electionId") UUID electionId,
//            @RequestParam(value = "contestId", required = false) UUID contestId, // ✅ OPTIONAL
//            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
//            @RequestParam(value = "size", required = false) Integer size,
//            @RequestParam(value = "sort", required = false) String[] sort
//    ) {
//        if (electionId == null) return ResponseEntity.badRequest().build();
//
//        int requestedSize = size == null ? DEFAULT_PAGE_SIZE : size;
//        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);
//
//        Sort sortObj = Sort.unsorted();
//        if (sort != null && sort.length > 0) {
//            Sort.Order[] orders = new Sort.Order[sort.length];
//            for (int i = 0; i < sort.length; i++) {
//                String s = sort[i];
//                String[] parts = s.split(",");
//                if (parts.length == 1) orders[i] = Sort.Order.asc(parts[0].trim());
//                else orders[i] = new Sort.Order(Sort.Direction.fromString(parts[1].trim()), parts[0].trim());
//            }
//            sortObj = Sort.by(orders);
//        }
//
//        Pageable pageable = PageRequest.of(page, pageSize, sortObj);
//
//        log.debug("Controller list official elections electionId={} contestId={} page={} size={} sort={}",
//                electionId, contestId, page, pageSize, sortObj);
//
//        meterRegistry.counter("api.stats.official.election.controller.requests",
//                "endpoint", "/api/stats/official/elections").increment();
//
//        Page<ElectionStatsOfficialDto> result =
//                service.listElectionStats(electionId, contestId, pageable); // contestId may be null ✅
//
//        return ResponseEntity.ok(result);
//    }
}
