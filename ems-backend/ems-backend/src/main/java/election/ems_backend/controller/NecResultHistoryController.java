package election.ems_backend.controller;

import election.ems_backend.dto.NecResultHistoryDto;
import election.ems_backend.service.NecResultHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * Read-only endpoints to query NEC result history entries.
 * These are admin/NEC endpoints — secure with method-level security in production.
 */
@RestController
@RequestMapping("/api/nec/results/history")
@RequiredArgsConstructor
public class NecResultHistoryController {

    private final NecResultHistoryService historyService;

    /**
     * Get history entries for a specific authoritative result (resultId).
     */
    @GetMapping("/result/{resultId}")
    public List<NecResultHistoryDto> getByResult(@PathVariable UUID resultId) {
        return historyService.listByResultId(resultId);
    }

    /**
     * Get history entries for an election (all centers), newest first.
     */
    @GetMapping("/election/{electionId}")
    public List<NecResultHistoryDto> getByElection(@PathVariable UUID electionId) {
        return historyService.listByElectionId(electionId);
    }

}