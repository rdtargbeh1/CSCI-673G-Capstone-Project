package election.ems_backend.controller;

import election.ems_backend.dto.VoterPublicDto;
import election.ems_backend.service.VoterRollService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/public/rolls")
@RequiredArgsConstructor
public class PublicVoterRollController {

    private final VoterRollService service;

    @GetMapping("/{electionId}/voters")
    public Page<VoterPublicDto> list(
            @PathVariable UUID electionId,
            @RequestParam(required = false) UUID countyId,
            @RequestParam(required = false) UUID districtId,
            @RequestParam(required = false) UUID centerId,
            @RequestParam(required = false) String place,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        return service.searchPublicRoll(electionId, countyId, districtId, centerId, place, PageRequest.of(page, size));
    }
}
