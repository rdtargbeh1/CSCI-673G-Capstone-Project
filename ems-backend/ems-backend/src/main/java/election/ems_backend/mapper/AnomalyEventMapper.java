package election.ems_backend.mapper;

import election.ems_backend.dto.AnomalyEventCreateRequest;
import election.ems_backend.dto.AnomalyEventDto;
import election.ems_backend.dto.AnomalyEventUpdateRequest;
import election.ems_backend.entity.AnomalyEvent;
import election.ems_backend.entity.Election;
import election.ems_backend.entity.Organization;
import election.ems_backend.entity.PollingCenter;
import org.springframework.stereotype.Component;


@Component
public class AnomalyEventMapper {


    public AnomalyEventDto toDTO(AnomalyEvent event){
        return AnomalyEventDto.builder()
                .anomalyId(event.getAnomalyId())
                .orgId(event.getOrganization().getOrgId())
                .electionId(event.getElection().getElectionId())
                .centerId(event.getPollingCenter() != null ? event.getPollingCenter().getCenterId() : null)
                .kind(event.getKind())
                .details(event.getDetails())
                .dateCreated(event.getDateCreated())
                .build();
    }

    public AnomalyEvent toEntity(AnomalyEventCreateRequest req, Organization org, Election election, PollingCenter center){
        AnomalyEvent event = new AnomalyEvent();
        event.setOrganization(org);
        event.setElection(election);
        event.setPollingCenter(center);
        event.setKind(req.getKind());
        event.setDetails(req.getDetails());

        return event;
    }


    public  void apply(AnomalyEventUpdateRequest req, AnomalyEvent event, PollingCenter center){
        if (req.getKind() != null) event.setKind(req.getKind());
        if (req.getDetails() != null) event.setDetails(req.getDetails());
        if (center != null) event.setPollingCenter(center);
    }
}
