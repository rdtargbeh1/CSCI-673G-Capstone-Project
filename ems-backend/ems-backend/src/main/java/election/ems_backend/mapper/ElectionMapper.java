package election.ems_backend.mapper;

import election.ems_backend.dto.ElectionCreateRequest;
import election.ems_backend.dto.ElectionDto;
import election.ems_backend.dto.ElectionUpdateRequest;
import election.ems_backend.entity.Election;
import org.springframework.stereotype.Component;

@Component
public class ElectionMapper {

    public ElectionDto toDTO(Election e) {

        if (e == null) return null;

        return ElectionDto.builder()
                .electionId(e.getElectionId())
                .electionName(e.getElectionName())
                .year(e.getYear())
                .electionType(e.getElectionType())
                .isActive(e.isActive())
                .ballotSparePercent(e.getBallotSparePercent())
                .enforceBallotsGteRegistered(e.isEnforceBallotsGteRegistered())
                .dateCreated(e.getDateCreated())
                .dateUpdated(e.getDateUpdated())
                .build();
    }

    public Election toEntity(ElectionCreateRequest req) {

        if (req == null) return null;

        boolean enforce = (req.getEnforceBallotsGteRegistered() == null) ? true : req.getEnforceBallotsGteRegistered();

        return Election.builder()
                .electionName(req.getElectionName())
                .year(req.getYear())
                .electionType(req.getElectionType())
                .isActive(req.isActive())
                .ballotSparePercent(req.getBallotSparePercent()) // ✅ NEW
                .enforceBallotsGteRegistered(enforce) // ✅ NEW
                .build();
    }


    public void apply(ElectionUpdateRequest req, Election e) {
        if (req == null || e == null) return;
        if (req.getElectionName() != null) e.setElectionName(req.getElectionName());
        if (req.getYear() != null) e.setYear(req.getYear());
        if (req.getElectionType() != null) e.setElectionType(req.getElectionType());
        if (req.getIsActive() != null) e.setActive(req.getIsActive());

        if (req.getBallotSparePercent() != null) e.setBallotSparePercent(req.getBallotSparePercent());
        if (req.getEnforceBallotsGteRegistered() != null) e.setEnforceBallotsGteRegistered(req.getEnforceBallotsGteRegistered());
    }

}