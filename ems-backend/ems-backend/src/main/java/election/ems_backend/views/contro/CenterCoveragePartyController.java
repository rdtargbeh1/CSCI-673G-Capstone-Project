package election.ems_backend.views.contro;


import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.dto.CenterCoveragePartyDto;
import election.ems_backend.views.service.CenterCoveragePartyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Center coverage (party): derived from v_place_coverage_party.
 */
@RestController
@RequestMapping("/api/stats/party/centers/coverage")
@RequiredArgsConstructor
public class CenterCoveragePartyController {

    private final CenterCoveragePartyService service;

    private static final int MAX_PAGE_SIZE = 500;

    @GetMapping
    public ResponseEntity<Page<CenterCoveragePartyDto>> list(
            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
            @RequestParam(value = "electionId", required = false) UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            @RequestParam(value = "started", required = false) Boolean started,
            @RequestParam(value = "completed", required = false) Boolean completed,
            Pageable pageable
    ) {

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
        UUID effectiveOrgId = orgIdParam;

        if (derivedOrgId != null) {
            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam)) {
                return ResponseEntity.status(403).build();
            }
            effectiveOrgId = derivedOrgId;
        } else {
            // SYSTEM mode must provide orgId because this view is org-scoped
            if (effectiveOrgId == null) {
                return ResponseEntity.badRequest().build();
            }
        }

        int size = Math.min(Math.max(1, pageable.getPageSize()), MAX_PAGE_SIZE);
        int page = Math.max(0, pageable.getPageNumber());
        Pageable adjusted = PageRequest.of(page, size, pageable.getSort());

        return ResponseEntity.ok(
                service.list(
                        effectiveOrgId,
                        electionId,
                        contestId,
                        centerId,
                        started,
                        completed,
                        adjusted
                )
        );
    }
}
