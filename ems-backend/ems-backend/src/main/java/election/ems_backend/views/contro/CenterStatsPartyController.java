package election.ems_backend.views.contro;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.dto.CenterStatsPartyDto;
import election.ems_backend.views.service.CenterStatsPartyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/**
 * Controller to expose center-level party stats.
 *
 * Notes:
 * - orgId can be derived from authenticated user in production. Here it's accepted as a parameter but should be validated.
 * - electionId is required.
 */
@RestController
@RequestMapping("/api/stats/party/centers")
@RequiredArgsConstructor
public class CenterStatsPartyController {

    private final CenterStatsPartyService service;

    // hard cap for page size to prevent resource exhaustion
    private static final int MAX_PAGE_SIZE = 500;

    @GetMapping
    public ResponseEntity<Page<CenterStatsPartyDto>> list(
            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "districtId", required = false) UUID districtId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            Pageable pageable
    ) {
        // Derive orgId from security context if available
        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();

        UUID effectiveOrgId = orgIdParam;
        if (derivedOrgId != null) {
            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam)) {
                // Client attempted to query a different org than the authenticated principal allows
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "orgId does not match authenticated organization");
            }
            effectiveOrgId = derivedOrgId;
        } else {
            // No derived org id; if client didn't provide one, we require it
            if (effectiveOrgId == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "orgId is required when not available in authentication");
            }
        }

        // Enforce sensible page size cap
        int requestedSize = pageable.getPageSize();
        int size = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);
        int page = Math.max(0, pageable.getPageNumber());
        Pageable adjusted = PageRequest.of(page, size, pageable.getSort());

        Page<CenterStatsPartyDto> pageResult = service.listCenterStats(effectiveOrgId, electionId, countyId, districtId, centerId, adjusted);
        return ResponseEntity.ok(pageResult);
    }
}