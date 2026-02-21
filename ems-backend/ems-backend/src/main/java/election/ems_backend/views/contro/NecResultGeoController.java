
package election.ems_backend.views.contro;

import election.ems_backend.views.dto.NecResultGeoDto;
import election.ems_backend.views.service.NecResultGeoService;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.*;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.OffsetDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/stats/official/nec/geo")
@RequiredArgsConstructor
@Validated
public class NecResultGeoController {

    private static final Logger log = LoggerFactory.getLogger(NecResultGeoController.class);

    private final NecResultGeoService service;
    private final MeterRegistry meterRegistry;

    private static final int MAX_PAGE_SIZE = 2000;
    private static final int DEFAULT_PAGE_SIZE = 100;

    @GetMapping
    public ResponseEntity<Page<NecResultGeoDto>> list(
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId,
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "districtId", required = false) UUID districtId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            @RequestParam(value = "uploadedAfter", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime uploadedAfter,
            @RequestParam(value = "uploadedBefore", required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime uploadedBefore,
            @RequestParam(value = "page", required = false, defaultValue = "0") @Min(0) int page,
            @RequestParam(value = "size", required = false) Integer size,
            @RequestParam(value = "sort", required = false) String[] sort
    ) {
        if (electionId == null) return ResponseEntity.badRequest().build();

        int requestedSize = (size == null) ? DEFAULT_PAGE_SIZE : size;
        int pageSize = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);

        Sort sortObj = parseSort(sort).orElse(Sort.by(Sort.Order.desc("uploadTime"))); // default newest first
        Pageable pageable = PageRequest.of(page, pageSize, sortObj);

        log.debug("Controller list nec geo electionId={} contestId={} countyId={} districtId={} centerId={} uploadedAfter={} uploadedBefore={} page={} size={} sort={}",
                electionId, contestId, countyId, districtId, centerId, uploadedAfter, uploadedBefore, page, pageSize, sortObj);

        meterRegistry.counter("api.stats.official.nec_geo.controller.requests",
                "endpoint", "/api/stats/official/nec/geo").increment();

        Page<NecResultGeoDto> result = service.listNecResultGeo(
                electionId,
                contestId,
                countyId,
                districtId,
                centerId,
                uploadedAfter,
                uploadedBefore,
                pageable
        );

        return ResponseEntity.ok(result);
    }

    /**
     * Supports:
     *  - sort=field,dir
     *  - sort=field&sort=dir  (paired)
     *  - multiple: sort=a,desc&sort=b,asc
     * Ignores invalid tokens like "desc" alone.
     */
    private Optional<Sort> parseSort(String[] sortParams) {
        if (sortParams == null || sortParams.length == 0) return Optional.empty();

        List<Sort.Order> orders = new ArrayList<>();

        for (int i = 0; i < sortParams.length; i++) {
            String token = (sortParams[i] == null) ? "" : sortParams[i].trim();
            if (token.isBlank()) continue;

            // Case 1: token is "field,dir"
            if (token.contains(",")) {
                String[] parts = token.split(",");
                String field = parts.length > 0 ? parts[0].trim() : "";
                String dirRaw = parts.length > 1 ? parts[1].trim() : "asc";

                if (field.isBlank()) continue;

                Sort.Direction dir;
                try {
                    dir = Sort.Direction.fromString(dirRaw);
                } catch (Exception e) {
                    dir = Sort.Direction.ASC;
                }
                orders.add(new Sort.Order(dir, field));
                continue;
            }

            // Case 2: token is just "desc"/"asc" -> ignore (or it might be paired with previous)
            if (token.equalsIgnoreCase("asc") || token.equalsIgnoreCase("desc")) {
                continue;
            }

            // Case 3: token is field, and next token is direction -> pair them
            if (i + 1 < sortParams.length) {
                String next = sortParams[i + 1] == null ? "" : sortParams[i + 1].trim();
                if (next.equalsIgnoreCase("asc") || next.equalsIgnoreCase("desc")) {
                    Sort.Direction dir = next.equalsIgnoreCase("desc") ? Sort.Direction.DESC : Sort.Direction.ASC;
                    orders.add(new Sort.Order(dir, token));
                    i++; // consume next
                    continue;
                }
            }

            // Case 4: token is field only -> default asc
            orders.add(Sort.Order.asc(token));
        }

        if (orders.isEmpty()) return Optional.empty();
        return Optional.of(Sort.by(orders));
    }
}

