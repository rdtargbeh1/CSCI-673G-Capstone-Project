package election.ems_backend.service;

import java.io.File;

/**
 * Storage abstraction for report artifacts.
 */
public interface ReportStorageService {
    String store(File file, String filename) throws Exception;
    byte[] fetch(String storageUri) throws Exception;
    String presign(String storageUri, long ttlSeconds) throws Exception;
}