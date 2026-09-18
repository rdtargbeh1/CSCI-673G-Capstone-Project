package election.ems_backend.controller;

import election.ems_backend.dto.VoteSubmissionActionDto;
import election.ems_backend.enums.VoteSubmissionActionType;
import election.ems_backend.service.implement.VoteSubmissionActionServiceImplementation;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/vote-submissions")
@RequiredArgsConstructor
public class VoteSubmissionActionController {

    private final VoteSubmissionActionServiceImplementation actionService;

    // ========================================================================
    // OVERSIGHT — SEARCH ALL ACTIONS
    //
    // GET /api/vote-submissions/actions
    // ========================================================================

    @GetMapping("/actions")
    public ResponseEntity<Page<VoteSubmissionActionDto>> searchActions(
            @RequestParam(required = false)
            UUID orgId,

            @RequestParam(required = false)
            UUID submissionId,

            @RequestParam(required = false)
            VoteSubmissionActionType actionType,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "25")
            int size
    ) {

        return ResponseEntity.ok(
                actionService.searchActions(
                        orgId,
                        submissionId,
                        actionType,
                        page,
                        size
                )
        );
    }

    // ========================================================================
    // OVERSIGHT — ONE ACTION
    //
    // GET /api/vote-submissions/actions/{actionId}
    // ========================================================================

    @GetMapping("/actions/{actionId}")
    public ResponseEntity<VoteSubmissionActionDto> getAction(
            @PathVariable UUID actionId
    ) {

        return ResponseEntity.ok(
                actionService.getAction(
                        actionId
                )
        );
    }

    // ========================================================================
    // ONE SUBMISSION — HISTORY
    //
    // GET /api/vote-submissions/{submissionId}/actions
    // ========================================================================

    @GetMapping("/{submissionId}/actions")
    public ResponseEntity<List<VoteSubmissionActionDto>> listActions(
            @PathVariable UUID submissionId
    ) {

        return ResponseEntity.ok(
                actionService.listForSubmission(
                        submissionId
                )
        );
    }

    // ========================================================================
    // ONE SUBMISSION — COUNT
    // ========================================================================

    @GetMapping("/{submissionId}/actions/count")
    public ResponseEntity<Long> countActions(
            @PathVariable UUID submissionId
    ) {

        return ResponseEntity.ok(
                actionService.countForSubmission(
                        submissionId
                )
        );
    }

    @GetMapping("/{submissionId}/actions/count/{actionType}")
    public ResponseEntity<Long> countActionsByType(
            @PathVariable UUID submissionId,
            @PathVariable VoteSubmissionActionType actionType
    ) {

        return ResponseEntity.ok(
                actionService.countForSubmissionByType(
                        submissionId,
                        actionType
                )
        );
    }

}