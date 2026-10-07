package election.ems_backend.service;

import java.util.UUID;

public interface PublishStagingService {
    /**
     * Promote a single staging row (by stagingId) calling DB function publish_nec_result(stagingId, actorUserId).
     * Runs in its own transaction to isolate failures per row.
     */
    void publishStagingRow(UUID stagingId, UUID actorUserId);
}