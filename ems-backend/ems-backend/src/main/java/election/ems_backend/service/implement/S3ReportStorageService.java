package election.ems_backend.service.implement;

import election.ems_backend.service.ReportStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

import java.io.File;
import java.net.URI;
import java.time.Duration;
import java.util.UUID;

/**
 * S3-backed storage. Active only when reports.storage=s3
 */
@Service
@ConditionalOnProperty(name = "reports.storage", havingValue = "s3")
public class S3ReportStorageService implements ReportStorageService {

    private final S3Client s3;
    private final S3Presigner presigner;

    @Value("${reports.s3.bucket}")
    private String bucket;

    @Value("${reports.s3.basePath:reports}")
    private String basePath;

    public S3ReportStorageService(S3Client s3, S3Presigner presigner) {
        this.s3 = s3;
        this.presigner = presigner;
    }

    @Override
    public String store(File file, String filename) throws Exception {
        String key = basePath + "/" + UUID.randomUUID() + "-" + filename;
        PutObjectRequest put = PutObjectRequest.builder()
                .bucket(bucket)
                .key(key)
                .build();
        s3.putObject(put, RequestBody.fromFile(file));
        return "s3://" + bucket + "/" + key;
    }

    @Override
    public byte[] fetch(String storageUri) throws Exception {
        URI uri = new URI(storageUri);
        String key = uri.getPath().substring(1);
        GetObjectRequest get = GetObjectRequest.builder().bucket(bucket).key(key).build();
        try (var is = s3.getObject(get)) {
            return is.readAllBytes();
        }
    }

    @Override
    public String presign(String storageUri, long ttlSeconds) throws Exception {
        URI uri = new URI(storageUri);
        String key = uri.getPath().substring(1);
        GetObjectRequest getObjectRequest = GetObjectRequest.builder().bucket(bucket).key(key).build();
        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofSeconds(ttlSeconds))
                .getObjectRequest(getObjectRequest)
                .build();
        PresignedGetObjectRequest p = presigner.presignGetObject(presignRequest);
        return p.url().toString();
    }
}
