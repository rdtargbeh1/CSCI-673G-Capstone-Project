package election.ems_backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;

public interface FileStorageService {

    /**
     * Store a single uploaded file and return a storage URL or key that is safe to persist.
     *
     * @param folder folder/prefix used by storage implementation (e.g. "vote_submission/{id}/2025-11-29")
     * @param storedName sanitized, unique name to store
     * @param input input stream providing the binary content
     * @param size number of bytes
     * @param contentType mime-type
     * @return storage location / URL / key (opaque string to persist)
     */
    String store(String folder, String storedName, InputStream input, long size, String contentType) throws IOException;

    /**
     * Delete stored object previously returned by store().
     *
     * Implementations should attempt best-effort deletion; errors should be logged but not bubble out
     * during cleanup callbacks.
     *
     * @param fileUrlOrKey opaque string previously returned by store
     */
    void delete(String fileUrlOrKey);

    /**
     * Human-friendly provider name (e.g., "LOCAL", "S3", "GCS") used when persisting storageProvider enum.
     */
    String getProviderName();

    /**
     * Optional: generate presigned upload URL for direct client uploads.
     * Default: not supported.
     */
    default PresignResult presignUpload(String folder,
                                        String originalFileName,
                                        String contentType,
                                        long contentLength,
                                        Duration ttl) {
        throw new UnsupportedOperationException("Presign not supported");
    }

    class PresignResult {
        public final String key;
        public final String url;
        public final long maxContentLength;
        public final String contentType;

        public PresignResult(String key, String url, long maxContentLength, String contentType) {
            this.key = key;
            this.url = url;
            this.maxContentLength = maxContentLength;
            this.contentType = contentType;
        }
    }
}