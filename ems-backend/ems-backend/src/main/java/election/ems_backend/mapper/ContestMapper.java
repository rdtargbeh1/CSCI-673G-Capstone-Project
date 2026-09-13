package election.ems_backend.mapper;

import election.ems_backend.dto.ContestCreateRequest;
import election.ems_backend.dto.ContestDto;
import election.ems_backend.dto.ContestUpdateRequest;
import election.ems_backend.entity.Contest;
import org.springframework.stereotype.Component;

@Component
public class ContestMapper {

    public ContestDto toDTO(Contest contest){

        if (contest == null) return  null;

        ContestDto dto = new ContestDto();
        dto.setContestId(contest.getContestId());
        dto.setElectionId(contest.getElectionId());
        dto.setContestName(contest.getContestName());
        dto.setCategory(contest.getCategory());
        dto.setScopeType(contest.getScopeType());
        dto.setCountyId(contest.getCountyId());
        dto.setDistrictId(contest.getDistrictId());
        dto.setVoteMethod(contest.getVoteMethod());
        dto.setSeats(contest.getSeats());
        dto.setMaxSelections(contest.getMaxSelections());

        dto.setDescription(contest.getDescription());

        dto.setStatus(contest.getStatus());
        dto.setIsActive(contest.isActive());

        dto.setDateCreated(contest.getDateCreated());
        dto.setDateUpdated(contest.getDateUpdated());

        return dto;
    }


    public Contest toEntity(ContestCreateRequest req) {
        Contest c = new Contest();
        c.setElectionId(req.getElectionId());
        c.setContestName(req.getContestName());

        c.setCategory(req.getCategory());
        c.setScopeType(req.getScopeType());
        c.setCountyId(req.getCountyId());
        c.setDistrictId(req.getDistrictId());

        c.setVoteMethod(req.getVoteMethod());
        c.setSeats(req.getSeats() == null ? 1 : req.getSeats());
        c.setMaxSelections(req.getMaxSelections() == null ? 1 : req.getMaxSelections());

        c.setDescription(req.getDescription());

        c.setStatus(req.getStatus());
        c.setActive(req.getIsActive() == null || req.getIsActive());
        return c;
    }

    public void apply(ContestUpdateRequest req, Contest contest) {
        if (req.getElectionId() != null) contest.setElectionId(req.getElectionId());
        if (req.getContestName() != null) contest.setContestName(req.getContestName());

        if (req.getCategory() != null) contest.setCategory(req.getCategory());
        if (req.getScopeType() != null) contest.setScopeType(req.getScopeType());
        if (req.getCountyId() != null || req.getScopeType() != null) contest.setCountyId(req.getCountyId());
        if (req.getDistrictId() != null || req.getScopeType() != null) contest.setDistrictId(req.getDistrictId());

        if (req.getVoteMethod() != null) contest.setVoteMethod(req.getVoteMethod());
        if (req.getSeats() != null) contest.setSeats(req.getSeats());
        if (req.getMaxSelections() != null) contest.setMaxSelections(req.getMaxSelections());

        if (req.getDescription() != null) contest.setDescription(req.getDescription());

        if (req.getStatus() != null) contest.setStatus(req.getStatus());
        if (req.getIsActive() != null) contest.setActive(req.getIsActive());
    }

}
