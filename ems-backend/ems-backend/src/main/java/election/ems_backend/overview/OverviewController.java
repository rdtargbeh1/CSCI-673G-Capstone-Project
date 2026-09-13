package election.ems_backend.overview;


import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workspace/elections")
public class OverviewController {

    private final OverviewService overviewService;

    /**
     * Overview endpoint used by frontend OverviewTab.
     *
     * electionId: route param
     * orgId: derived from tenant header or auth context in your system.
     *
     * If you already have a tenant resolver (X-Org-Id), do NOT accept orgId from client;
     * resolve it server-side and pass to service.
     */
    @GetMapping("/{electionId}/overview")
    public OverviewDto overview(
            @PathVariable UUID electionId,
            @RequestParam String mode,
            @RequestHeader(value = "X-Org-Id", required = false) UUID orgId
    ) {
        boolean tenantMode = "TENANT".equalsIgnoreCase(mode);

        if (tenantMode && orgId == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Missing X-Org-Id for TENANT mode"
            );
        }

        return overviewService.getOverview(electionId, orgId, tenantMode);
    }


}
