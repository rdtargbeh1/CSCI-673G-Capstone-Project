package election.ems_backend.service;

import election.ems_backend.dto.VoterPublicDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.UUID;

public interface VoterRollService {
    /**
     * Publish (create/replace) the public voter roll snapshot for an election.
     * Only NEC actors should be allowed to call this.
     * Returns number of rows published.
     */
    int publishRoll(UUID electionId, UUID actorUserId);

    /**
     * Unpublish (remove) the public voter roll snapshot for an election.
     * Only NEC actors should be allowed to call this.
     */
    void unpublishRoll(UUID electionId, UUID actorUserId);

    /**
     * Public search of the published roll (filters optional).
     */
    Page<VoterPublicDto> searchPublicRoll(UUID electionId, UUID countyId, UUID districtId, UUID centerId, String place, Pageable pageable);
}