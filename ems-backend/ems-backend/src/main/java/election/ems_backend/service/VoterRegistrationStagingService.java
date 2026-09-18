package election.ems_backend.service;

import election.ems_backend.dto.VoterRegistrationStagingCreateRequest;
import election.ems_backend.dto.VoterRegistrationStagingDto;

import java.util.List;
import java.util.UUID;

public interface VoterRegistrationStagingService {

    VoterRegistrationStagingDto submitRow(VoterRegistrationStagingCreateRequest req);

    List<VoterRegistrationStagingDto> listByBatch(UUID batchId);

    /**
     * Validate rows in a batch (or all unvalidated when batchId null).
     * Validations performed:
     * - nationalId present
     * - fullName present
     * - assignedCenterCode resolves to a known center (optional — marks error if not)
     * - duplicate detection against existing voter_registration via lookupHash
     *
     * Returns number of rows validated (updated).
     */
    int validateBatch(UUID batchId, UUID validatorUserId);

    /**
     * Promote validated rows in a batch into voter_registration.
     * Only validated rows that are not yet processed will be promoted.
     * actorUserId is the operator performing the promotion (used for registeredBy and org).
     *
     * Returns number of rows promoted.
     */
    int promoteBatch(UUID batchId, UUID actorUserId);
}