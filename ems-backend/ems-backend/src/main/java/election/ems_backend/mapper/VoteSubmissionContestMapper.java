package election.ems_backend.mapper;

import election.ems_backend.dto.VoteSubmissionContestDto;
import election.ems_backend.entity.VoteSubmissionContest;
import org.springframework.stereotype.Component;

@Component
public class VoteSubmissionContestMapper {

    public VoteSubmissionContestDto toDto(VoteSubmissionContest e) {
        if (e == null) return null;

        VoteSubmissionContestDto d = new VoteSubmissionContestDto();
        d.setScvId(e.getScvId());

        d.setSubmissionId(e.getSubmissionId());
        d.setOrgId(e.getOrgId());

        d.setElectionId(e.getElectionId());
        d.setContestId(e.getContestId());
        d.setOptionId(e.getOptionId());

        d.setVoteValue(e.getVoteValue());
        d.setRank(e.getRank());

        d.setDateCreated(e.getDateCreated());

        // optional convenience fields (won't load unless accessed)
        if (e.getContest() != null) d.setContestName(e.getContest().getContestName());
        if (e.getOption() != null) {
            d.setOptionLabel(e.getOption().getOptionLabel()); // label contests
            // for candidate options, optionLabel is null; UI can resolve candidate separately if needed
        }

        return d;
    }
}
