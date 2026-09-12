package election.ems_backend.service;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;


/**
 * Storage abstraction used by FileUpload.
 *
 * Implementations:
 *
 * LOCAL
 * AWS S3
 *
 * Domain entities and FileUploadService do not need to know
 * which physical storage provider is active.
 */
public interface FileStorageService {

    // =========================================================================
    // STORE
    // =========================================================================

    /**
     * Stores a single file and returns an opaque storage location
     * that is safe to persist.
     *
     * LOCAL example:
     *
     * file:///.../uploaded_files/party/.../logo.png
     *
     * S3 example:
     *
     * election-vote-tracker/party/.../logo.png
     */
    String store(
            String folder,
            String storedName,
            InputStream input,
            long size,
            String contentType
    ) throws IOException;


    // =========================================================================
    // READ
    // =========================================================================

    /**
     * Reads a previously stored object.
     *
     * Primarily used when the application needs to proxy file content,
     * such as local-development images.
     */
    byte[] read(
            String fileUrlOrKey
    ) throws IOException;


    // =========================================================================
    // DELETE
    // =========================================================================

    /**
     * Best-effort delete of a previously stored object.
     */
    void delete(
            String fileUrlOrKey
    );


    // =========================================================================
    // PROVIDER
    // =========================================================================

    /**
     * Human-readable provider name.
     *
     * Expected values:
     *
     * LOCAL
     * S3
     */
    String getProviderName();


    // =========================================================================
    // PRESIGNED UPLOAD
    // =========================================================================

    /**
     * Optional direct-upload support.
     *
     * LOCAL storage does not need to implement this.
     */
    default PresignResult presignUpload(
            String folder,
            String originalFileName,
            String contentType,
            long contentLength,
            Duration ttl
    ) {

        throw new UnsupportedOperationException(
                "Presigned upload is not supported by this storage provider"
        );
    }


    // =========================================================================
    // PRESIGNED READ
    // =========================================================================

    /**
     * Optional temporary read URL.
     *
     * S3 implements this using a presigned GET request.
     *
     * LOCAL returns null because local files are served through
     * the application's FileUpload content endpoint.
     */
    default String presignRead(
            String fileUrlOrKey,
            Duration ttl
    ) {

        return null;
    }


    // =========================================================================
    // PRESIGN RESULT
    // =========================================================================

    class PresignResult {

        public final String key;

        public final String url;

        public final long maxContentLength;

        public final String contentType;


        public PresignResult(
                String key,
                String url,
                long maxContentLength,
                String contentType
        ) {

            this.key =
                    key;

            this.url =
                    url;

            this.maxContentLength =
                    maxContentLength;

            this.contentType =
                    contentType;
        }
    }
}