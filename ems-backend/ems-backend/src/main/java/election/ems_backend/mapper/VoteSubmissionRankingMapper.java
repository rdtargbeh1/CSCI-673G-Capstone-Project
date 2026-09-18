package election.ems_backend.mapper;

import election.ems_backend.dto.VoteSubmissionRankingDto;
import election.ems_backend.entity.VoteSubmissionRanking;
import org.springframework.stereotype.Component;

@Component
public class VoteSubmissionRankingMapper {

    public VoteSubmissionRankingDto toDto(VoteSubmissionRanking e) {
        if (e == null) return null;

        VoteSubmissionRankingDto d = new VoteSubmissionRankingDto();
        d.setSvrId(e.getSvrId());
        d.setSubmissionId(e.getSubmissionId());
        d.setContestId(e.getContestId());
        d.setRanking(e.getRanking());
        d.setDateCreated(e.getDateCreated());

        if (e.getContest() != null) {
            d.setContestName(e.getContest().getContestName());
        }

        return d;
    }
}
