package election.ems_backend.controller;

import election.ems_backend.dto.*;
import election.ems_backend.service.NECResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/nec-results")
@RequiredArgsConstructor
public class NECResultController {

    private final NECResultService service;

    @PostMapping
    public NECResultDto create(@Valid @RequestBody NECResultCreateRequest req) {
        return service.create(req);
    }

    @PutMapping("/{id}")
    public NECResultDto update(@PathVariable UUID id, @RequestBody NECResultUpdateRequest req) {
        return service.update(id, req);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id) {
        service.delete(id);
    }

    @GetMapping("/{id}")
    public NECResultDto get(@PathVariable UUID id) {
        return service.get(id);
    }

    @GetMapping
    public Page<NECResultDto> search(
            @RequestParam(required = false) UUID electionId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime uploadedAfter,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime uploadedBefore,
            @PageableDefault(size = 20, sort = "uploadTime", direction = Sort.Direction.DESC) Pageable pageable) {
        return service.search(electionId, centerId, uploadedAfter, uploadedBefore, pageable);
    }

    // ----- Stats / Rollups -----

    @GetMapping("/stats/totals")
    public NECOverallTotalsDto totals(@RequestParam UUID electionId,
                                      @RequestParam(required = false) UUID centerId) {
        return service.totals(electionId, centerId);
    }

    @GetMapping("/stats/by-candidate")
    public List<CandidateVoteTotalDto> byCandidate(@RequestParam UUID electionId,
                                                   @RequestParam(required = false) UUID centerId) {
        return service.totalsByCandidate(electionId, centerId);
    }

    @GetMapping("/stats/by-county")
    public List<CandidateScopedTotalDto> byCounty(@RequestParam UUID electionId) {
        return service.byCountyPerCandidate(electionId);
    }

    @GetMapping("/stats/by-district")
    public List<CandidateScopedTotalDto> byDistrict(@RequestParam UUID electionId,
                                                    @RequestParam(required = false) UUID countyId) {
        return service.byDistrictPerCandidate(electionId, countyId);
    }

    @GetMapping("/stats/daily")
    public List<CandidateDailyTotalDto> daily(@RequestParam UUID electionId) {
        return service.dailyByCandidate(electionId);
    }


}