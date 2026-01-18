package election.ems_backend.service.implement;

import election.ems_backend.service.FileStorageService;
import io.jsonwebtoken.lang.Assert;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.time.Duration;
import java.util.UUID;

/**
 * S3-backed implementation. Uses AWS SDK v2.
 * Created only when reports.storage = s3.
 */
@Service
@RequiredArgsConstructor
@Primary
@ConditionalOnProperty(name = "reports.storage", havingValue = "s3")
public class S3FileStorageServiceImplementation implements FileStorageService {

    private final S3Client s3;
    private final S3Presigner presigner;

    @Value("${app.storage.bucket}")
    private String bucket;

    @Value("${app.storage.prefix:}")
    private String prefix;

    @Override
    public String store(String folder, String storedName, InputStream input, long size, String contentType) throws IOException {
        Assert.notNull(bucket, "S3 bucket must be configured");

        String key = buildKey(folder, storedName);

        PutObjectRequest req = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .contentLength(size)
                .build();

        // stream directly from input (sdk will read)
        s3.putObject(req, RequestBody.fromInputStream(input, size));

        // Return an opaque key you persist (application can choose to store full s3:// or just key)
        return key;
    }

    @Override
    public void delete(String fileUrlOrKey) {
        if (fileUrlOrKey == null || fileUrlOrKey.isBlank()) return;
        String key = extractKey(fileUrlOrKey);
        try {
            DeleteObjectRequest req = DeleteObjectRequest.builder().bucket(bucket).key(key).build();
            s3.deleteObject(req);
        } catch (Exception ex) {
            // best-effort: log and continue
            System.err.println("Failed to delete S3 object " + key + ": " + ex.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "S3";
    }

    @Override
    public FileStorageService.PresignResult presignUpload(
            String folder,
            String originalFileName,
            String contentType,
            long contentLength,
            Duration ttl
    ) {
        String key = buildKey(folder, originalFileName);
        PutObjectRequest por = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .contentType(contentType)
                .contentLength(contentLength)
                .build();

        PutObjectPresignRequest ppreq = PutObjectPresignRequest.builder()
                .putObjectRequest(por)
                .signatureDuration(ttl)
                .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(ppreq);

        return new FileStorageService.PresignResult(
                key,
                presigned.url().toString(),
                contentLength,
                contentType
        );
    }

    private String buildKey(String folder, String storedName) {
        String p = (prefix == null || prefix.isBlank()) ? "" : (prefix.endsWith("/") ? prefix : prefix + "/");
        String folderPart = (folder == null || folder.isBlank()) ? "" : (folder.endsWith("/") ? folder : folder + "/");
        String safe = storedName == null ? UUID.randomUUID().toString() : storedName.replaceAll("[^a-zA-Z0-9._-]", "_");
        return String.format("%s%s%s", p, folderPart, safe);
    }

    private String extractKey(String fileUrlOrKey) {
        if (fileUrlOrKey.startsWith("s3://")) {
            String after = fileUrlOrKey.substring(5);
            int idx = after.indexOf('/');
            if (idx >= 0) return after.substring(idx + 1);
            return after;
        }
        if (fileUrlOrKey.startsWith("https://") || fileUrlOrKey.startsWith("http://")) {
            return fileUrlOrKey;
        }
        return fileUrlOrKey;
    }
}
