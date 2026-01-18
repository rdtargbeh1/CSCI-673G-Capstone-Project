package election.ems_backend.service;

import java.util.UUID;

/**
 * Internal generator service - executes report job for a given snapshot.
 * Implementations should perform generation asynchronously (the scaffold uses @Async).
 */
public interface ReportGeneratorService {
    /**
     * Generate report artifacts for the given snapshot id.
     * Implementations are expected to update ReportSnapshot/ReportFile rows and handle errors.
     *
     * @param snapshotId snapshot UUID created by ReportService
     */
    void generate(UUID snapshotId);
}