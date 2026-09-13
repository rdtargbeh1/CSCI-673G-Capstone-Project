package election.ems_backend.views.contro;

import election.ems_backend.views.dto.CenterCoverageOfficialDto;
import election.ems_backend.views.service.CenterCoverageOfficialService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Center coverage (official): derived from v_place_coverage_official.
 */
@RestController
@RequestMapping("/api/stats/official/centers/coverage")
@RequiredArgsConstructor
public class CenterCoverageOfficialController {

    private final CenterCoverageOfficialService service;

    private static final int MAX_PAGE_SIZE = 500;

    @GetMapping
    public ResponseEntity<Page<CenterCoverageOfficialDto>> list(
            @RequestParam(value = "electionId", required = false) UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId,
            @RequestParam(value = "centerId", required = false) UUID centerId,
            @RequestParam(value = "started", required = false) Boolean started,
            @RequestParam(value = "completed", required = false) Boolean completed,
            Pageable pageable
    ) {

        int size = Math.min(Math.max(1, pageable.getPageSize()), MAX_PAGE_SIZE);
        int page = Math.max(0, pageable.getPageNumber());
        Pageable adjusted = PageRequest.of(page, size, pageable.getSort());

        return ResponseEntity.ok(
                service.list(electionId, contestId, centerId, started, completed, adjusted)
        );
    }
}
