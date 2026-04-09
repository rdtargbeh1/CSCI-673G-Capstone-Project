package election.ems_backend.controller;

import election.ems_backend.dto.VoterRegistrationCreateRequest;
import election.ems_backend.dto.VoterRegistrationDto;
import election.ems_backend.service.VoterRegistrationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/centers/{centerId}/voters")
@RequiredArgsConstructor
public class VoterRegistrationController {

    private final VoterRegistrationService service;

    @PostMapping
    public VoterRegistrationDto create(@PathVariable("centerId") UUID centerId, @RequestBody VoterRegistrationCreateRequest req) {
        req.setAssignedCenterId(centerId);
        return service.create(req);
    }

    @GetMapping("/lookup")
    public VoterRegistrationDto lookupByHash(@RequestParam String lookupHash) {
        return service.findByLookupHash(lookupHash);
    }

    @GetMapping("/{voterId}")
    public VoterRegistrationDto get(@PathVariable("voterId") UUID voterId) {
        return service.getById(voterId);
    }

    @PostMapping("/{voterId}/transfer")
    public VoterRegistrationDto transfer(@PathVariable("voterId") UUID voterId,
                                         @RequestParam UUID toCenterId,
                                         @RequestParam(required = false) UUID actorUserId) {
        return service.transferToCenter(voterId, toCenterId, actorUserId);
    }

    // list by center (useful for roll extraction)
    @GetMapping("/all")
    public List<VoterRegistrationDto> listByCenter(@PathVariable("centerId") UUID centerId) {
        return service.listByCenter(centerId);
    }

    // separate endpoints for district/county listing
    @GetMapping("/by-district")
    public List<VoterRegistrationDto> listByDistrict(@RequestParam UUID districtId) {
        return service.listByDistrict(districtId);
    }

    @GetMapping("/by-county")
    public List<VoterRegistrationDto> listByCounty(@RequestParam UUID countyId) {
        return service.listByCounty(countyId);
    }

    @PostMapping("/{voterId}/assign-election")
    public VoterRegistrationDto assignToElection(@PathVariable("voterId") UUID voterId,
                                                 @RequestParam UUID electionId,
                                                 @RequestParam(required = false) UUID actorUserId) {
        return service.assignToElection(voterId, electionId, actorUserId);
    }
}
