package election.ems_backend.service.implement;

import election.ems_backend.service.FileStorageService;
import io.jsonwebtoken.lang.Assert;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.core.ResponseBytes;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectResponse;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.time.Duration;
import java.util.UUID;


/**
 * AWS S3 implementation of FileStorageService.
 *
 * Enabled when:
 *
 * app.storage.provider=s3
 *
 * Stored values are S3 object keys rather than public URLs.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        name = "app.storage.provider",
        havingValue = "s3"
)
public class S3FileStorageServiceImplementation implements FileStorageService {

    private final S3Client s3;

    private final S3Presigner presigner;


    @Value("${app.storage.bucket}")
    private String bucket;


    @Value("${app.storage.prefix:}")
    private String prefix;


    // =========================================================================
    // STORE
    // =========================================================================

    @Override
    public String store(
            String folder,
            String storedName,
            InputStream input,
            long size,
            String contentType
    ) throws IOException {

        Assert.hasText(
                bucket,
                "S3 bucket must be configured"
        );


        String key =
                buildKey(
                        folder,
                        storedName
                );


        PutObjectRequest request =
                PutObjectRequest
                        .builder()
                        .bucket(
                                bucket
                        )
                        .key(
                                key
                        )
                        .contentType(
                                contentType
                        )
                        .contentLength(
                                size
                        )
                        .build();


        try {

            s3.putObject(
                    request,
                    RequestBody.fromInputStream(
                            input,
                            size
                    )
            );

        } catch (
                Exception ex
        ) {

            throw new IOException(
                    "Failed to store file in S3",
                    ex
            );
        }


        /*
         * Persist the key, not a public URL.
         */
        return key;
    }


    // =========================================================================
    // READ
    // =========================================================================

    @Override
    public byte[] read(
            String fileUrlOrKey
    ) throws IOException {

        String key =
                extractKey(
                        fileUrlOrKey
                );


        GetObjectRequest request =
                GetObjectRequest
                        .builder()
                        .bucket(
                                bucket
                        )
                        .key(
                                key
                        )
                        .build();


        try {

            ResponseBytes<GetObjectResponse> response =
                    s3.getObjectAsBytes(
                            request
                    );


            return response.asByteArray();

        } catch (
                Exception ex
        ) {

            throw new IOException(
                    "Failed to read file from S3",
                    ex
            );
        }
    }


    // =========================================================================
    // DELETE
    // =========================================================================

    @Override
    public void delete(
            String fileUrlOrKey
    ) {

        if (
                fileUrlOrKey == null ||
                        fileUrlOrKey.isBlank()
        ) {
            return;
        }


        String key =
                extractKey(
                        fileUrlOrKey
                );


        try {

            DeleteObjectRequest request =
                    DeleteObjectRequest
                            .builder()
                            .bucket(
                                    bucket
                            )
                            .key(
                                    key
                            )
                            .build();


            s3.deleteObject(
                    request
            );

        } catch (
                Exception ex
        ) {

            log.warn(
                    "Failed to delete S3 object '{}': {}",
                    key,
                    ex.getMessage()
            );
        }
    }


    // =========================================================================
    // PROVIDER
    // =========================================================================

    @Override
    public String getProviderName() {
        return "S3";
    }


    // =========================================================================
    // PRESIGNED UPLOAD
    // =========================================================================

    @Override
    public FileStorageService.PresignResult presignUpload(
            String folder,
            String originalFileName,
            String contentType,
            long contentLength,
            Duration ttl
    ) {

        String key =
                buildKey(
                        folder,
                        originalFileName
                );


        PutObjectRequest putRequest =
                PutObjectRequest
                        .builder()
                        .bucket(
                                bucket
                        )
                        .key(
                                key
                        )
                        .contentType(
                                contentType
                        )
                        .contentLength(
                                contentLength
                        )
                        .build();


        PutObjectPresignRequest presignRequest =
                PutObjectPresignRequest
                        .builder()
                        .putObjectRequest(
                                putRequest
                        )
                        .signatureDuration(
                                normalizeTtl(
                                        ttl
                                )
                        )
                        .build();


        PresignedPutObjectRequest presigned =
                presigner.presignPutObject(
                        presignRequest
                );


        return new FileStorageService.PresignResult(
                key,
                presigned
                        .url()
                        .toString(),
                contentLength,
                contentType
        );
    }


    // =========================================================================
    // PRESIGNED READ
    // =========================================================================

    @Override
    public String presignRead(
            String fileUrlOrKey,
            Duration ttl
    ) {

        if (
                fileUrlOrKey == null ||
                        fileUrlOrKey.isBlank()
        ) {

            return null;
        }


        String key =
                extractKey(
                        fileUrlOrKey
                );


        GetObjectRequest getRequest =
                GetObjectRequest
                        .builder()
                        .bucket(
                                bucket
                        )
                        .key(
                                key
                        )
                        .build();


        GetObjectPresignRequest presignRequest =
                GetObjectPresignRequest
                        .builder()
                        .getObjectRequest(
                                getRequest
                        )
                        .signatureDuration(
                                normalizeTtl(
                                        ttl
                                )
                        )
                        .build();


        PresignedGetObjectRequest presigned =
                presigner.presignGetObject(
                        presignRequest
                );


        return presigned
                .url()
                .toString();
    }


    // =========================================================================
    // BUILD KEY
    // =========================================================================

    private String buildKey(
            String folder,
            String storedName
    ) {

        String prefixPart =
                prefix == null ||
                        prefix.isBlank()
                        ? ""
                        : (
                        prefix.endsWith("/")
                                ? prefix
                                : prefix + "/"
                );


        String folderPart =
                folder == null ||
                        folder.isBlank()
                        ? ""
                        : (
                        folder.endsWith("/")
                                ? folder
                                : folder + "/"
                );


        String safeName =
                storedName == null ||
                        storedName.isBlank()
                        ? UUID
                        .randomUUID()
                        .toString()
                        : storedName.replaceAll(
                        "[^a-zA-Z0-9._-]",
                        "_"
                );


        return prefixPart
                + folderPart
                + safeName;
    }


    // =========================================================================
    // EXTRACT KEY
    // =========================================================================

    private String extractKey(
            String fileUrlOrKey
    ) {

        if (
                fileUrlOrKey == null
        ) {

            return null;
        }


        String value =
                fileUrlOrKey.trim();


        /*
         * Normal/current case:
         *
         * FileUpload.fileUrl stores the S3 object key directly.
         */
        if (
                !value.startsWith(
                        "s3://"
                ) &&
                        !value.startsWith(
                                "http://"
                        ) &&
                        !value.startsWith(
                                "https://"
                        )
        ) {

            return value;
        }


        /*
         * Legacy:
         *
         * s3://bucket-name/path/to/file
         */
        if (
                value.startsWith(
                        "s3://"
                )
        ) {

            String afterScheme =
                    value.substring(
                            5
                    );


            int slash =
                    afterScheme.indexOf(
                            '/'
                    );


            if (
                    slash >= 0 &&
                            slash <
                                    afterScheme.length() - 1
            ) {

                return afterScheme.substring(
                        slash + 1
                );
            }


            return afterScheme;
        }


        /*
         * Legacy S3 HTTPS values.
         *
         * New uploads should NOT persist HTTPS URLs, but supporting
         * old values avoids breaking existing records.
         */
        try {

            URI uri =
                    URI.create(
                            value
                    );


            String path =
                    uri.getPath();


            if (
                    path == null ||
                            path.isBlank()
            ) {

                return value;
            }


            String key =
                    path.startsWith("/")
                            ? path.substring(1)
                            : path;


            /*
             * Path-style S3 URLs may contain:
             *
             * /bucket-name/key
             */
            if (
                    key.startsWith(
                            bucket + "/"
                    )
            ) {

                key =
                        key.substring(
                                bucket.length() + 1
                        );
            }


            return key;

        } catch (
                Exception ex
        ) {

            return value;
        }
    }


    // =========================================================================
    // TTL
    // =========================================================================

    private Duration normalizeTtl(
            Duration ttl
    ) {

        if (
                ttl == null ||
                        ttl.isZero() ||
                        ttl.isNegative()
        ) {

            return Duration.ofMinutes(
                    15
            );
        }


        return ttl;
    }
}