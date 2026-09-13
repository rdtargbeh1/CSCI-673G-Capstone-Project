
package election.ems_backend.views.contro;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.dto.PlaceCoveragePartyDto;
import election.ems_backend.views.service.PlaceCoveragePartyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Place coverage for PARTY stats:
 * - expected places from allocations
 * - reported places from VERIFIED place-scoped submissions
 *
 * View: v_place_coverage_party
 */
@RestController
@RequestMapping("/api/stats/party/places/coverage")
@RequiredArgsConstructor
public class PlaceCoveragePartyController {

    private final PlaceCoveragePartyService service;

    private static final int MAX_PAGE_SIZE = 500;

    @GetMapping
    public ResponseEntity<Page<PlaceCoveragePartyDto>> list(
            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
            @RequestParam(value = "electionId", required = false) UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            @RequestParam(value = "placeId", required = false) UUID placeId,
            @RequestParam(value = "reported", required = false) Boolean reported,
            Pageable pageable
    ) {

        // Tenant scoping: if user is in an org context, lock orgId.
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        UUID effectiveOrgId = orgIdParam;

        if (derivedOrgId != null) {
            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam)) {
                return ResponseEntity.status(403).build();
            }
            effectiveOrgId = derivedOrgId;
        } else {
            // SYSTEM mode: require orgId (because view is org-scoped)
            if (effectiveOrgId == null) {
                return ResponseEntity.badRequest().build();
            }
        }

        int size = Math.min(Math.max(1, pageable.getPageSize()), MAX_PAGE_SIZE);
        int page = Math.max(0, pageable.getPageNumber());
        Pageable adjusted = PageRequest.of(page, size, pageable.getSort());

        Page<PlaceCoveragePartyDto> result = service.list(
                effectiveOrgId,
                electionId,
                contestId,
                centerId,
                placeId,
                reported,
                adjusted
        );

        return ResponseEntity.ok(result);
    }
}
