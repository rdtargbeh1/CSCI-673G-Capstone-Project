package election.ems_backend.mapper;

import election.ems_backend.dto.NecResultHistoryDto;
import election.ems_backend.entity.NecResultHistory;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.repository.SystemUserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;


/**
 * Simple mapper between NecResultHistory entity and NecResultHistoryDto.
 */
@Component
@RequiredArgsConstructor
public class NecResultHistoryMapper {

    private final SystemUserRepository systemUserRepository;

    public NecResultHistoryDto toDto(NecResultHistory h) {
        if (h == null) return null;

        NecResultHistoryDto d = new NecResultHistoryDto();
        d.setHistoryId(h.getHistoryId());
        d.setResultId(h.getResultId());
        d.setElectionId(h.getElectionId());
        d.setContestId(h.getContestId());
        d.setCenterId(h.getCenterId());
        d.setCandidateVotes(h.getCandidateVotes());

        d.setTotalRegisteredVoters(h.getTotalRegisteredVoters());
        d.setBallotsCast(h.getBallotsCast());
        d.setInvalidBallots(h.getInvalidBallots());
        d.setUnmarkedBallots(h.getUnmarkedBallots());
        d.setUnusedBallots(h.getUnusedBallots());
        d.setRejectedBallots(h.getRejectedBallots());
        d.setSpoiledBallots(h.getSpoiledBallots());

        d.setChangeType(h.getChangeType());

        d.setChangedBy(h.getChangedBy());

        // ✅ NEW: resolve username for actor (e.g., SYSTEM)
        if (h.getChangedBy() != null) {
            systemUserRepository.findById(h.getChangedBy())
                    .map(SystemUser::getUserName) // adjust if your field name differs
                    .ifPresent(d::setChangedByUserName);
        }

        d.setDateChanged(h.getDateChanged());
        d.setNotes(h.getNotes());
        d.setUserNote(h.getUserNote());

        return d;
    }
}

