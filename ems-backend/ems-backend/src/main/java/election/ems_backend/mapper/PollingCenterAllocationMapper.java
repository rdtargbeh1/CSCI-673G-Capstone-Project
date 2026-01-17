package election.ems_backend.mapper;


import election.ems_backend.dto.PollingCenterAllocationCreateRequest;
import election.ems_backend.dto.PollingCenterAllocationDto;
import election.ems_backend.dto.PollingCenterAllocationUpdateRequest;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.PollingCenter;
import election.ems_backend.entity.PollingCenterAllocation;
import org.springframework.stereotype.Component;

@Component
public class PollingCenterAllocationMapper {

    public PollingCenterAllocationDto toDTO(PollingCenterAllocation a) {
        if (a == null) return null;
        var e  = a.getElection();
        var pc = a.getPollingCenter();
        var d  = pc != null ? pc.getDistrict() : null;
        var c  = d  != null ? d.getCounty()   : null;

        return PollingCenterAllocationDto.builder()
                .allocationId(a.getAllocationId())
                .electionId(e != null ? e.getElectionId() : null)
                .electionName(e != null ? e.getElectionName() : null)
                .electionYear(e != null ? e.getYear() : null)
                .pollingCenterId(pc != null ? pc.getCenterId() : null)
                .centerCode(pc != null ? pc.getCode() : null)
                .centerName(pc != null ? pc.getCenterName() : null)
                .districtId(d != null ? d.getDistrictId() : null)
                .districtName(d != null ? d.getDistrictName() : null)
                .countyId(c != null ? c.getCountyId() : null)
                .countyName(c != null ? c.getCountyName() : null)
                .registeredVoters(a.getRegisteredVoters())
                .ballotsIssued(a.getBallotsIssued())
                .build();
    }

    public PollingCenterAllocation toEntity(
            PollingCenterAllocationCreateRequest req,
            Election e, PollingCenter pc) {
        var a = new PollingCenterAllocation();
        a.setElection(e);
        a.setPollingCenter(pc);
        a.setRegisteredVoters(req.getRegisteredVoters());
        a.setBallotsIssued(req.getBallotsIssued());
        return a;
    }

    public void apply(PollingCenterAllocationUpdateRequest req, PollingCenterAllocation a) {
        if (req == null || a == null) return;
        if (req.getRegisteredVoters() != null) a.setRegisteredVoters(req.getRegisteredVoters());
        if (req.getBallotsIssued() != null)    a.setBallotsIssued(req.getBallotsIssued());
    }

}
