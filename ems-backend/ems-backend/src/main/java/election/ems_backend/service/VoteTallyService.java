package election.ems_backend.service;

import election.ems_backend.dto.VoteTallyDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * VoteDetailService
 *
 * Business logic:
 * - vote_detail is a *derived* table that normalizes candidate_votes JSON
 *   from vote_submission into per-candidate rows.
 * - It is generated automatically from VERIFIED submissions.
 * - It is not manually edited by agents; you should not expose create/update/delete
 *   operations in public controllers.
 */

public interface VoteTallyService {

    /**
     * Read-only search for diagnostics / admin / reporting.
     * Does NOT change data.
     */
    public Page<VoteTallyDto> search(UUID orgId,
                                     UUID electionId,
                                     UUID electId,
                                     UUID partyId,
                                     UUID contestId,
                                     Pageable pageable);

    List<VoteTallyDto> recomputeForElection(UUID orgId,
                                            UUID electionId,
                                            UUID recomputedByUserId);

    List<VoteTallyDto> recomputeForElection(UUID orgId,
                                            UUID electionId);


}