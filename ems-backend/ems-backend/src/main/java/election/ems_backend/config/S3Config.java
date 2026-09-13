package election.ems_backend.config;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;

import java.net.URI;

/**
 * Unified S3 configuration supporting:
 * - AWS S3 via DefaultCredentialsProvider (IAM, env, profile)
 * - S3-compatible endpoints (MinIO) with optional explicit credentials
 *
 * Active only when reports.storage = s3.
 */
@Configuration
@ConditionalOnProperty(name = "reports.storage", havingValue = "s3")
public class S3Config {

    @Value("${reports.s3.endpoint:}")
    private String endpoint;

    @Value("${reports.s3.region:us-east-1}")
    private String region;

    @Value("${reports.s3.accessKey:}")
    private String accessKey;

    @Value("${reports.s3.secretKey:}")
    private String secretKey;

    @Bean
    @ConditionalOnMissingBean
    public Region awsRegion() {
        return Region.of(region);
    }

    @Bean
    @ConditionalOnMissingBean
    public S3Client s3Client(Region awsRegion) {
        S3ClientBuilder builder = S3Client.builder()
                .region(awsRegion);

        if (endpoint != null && !endpoint.isBlank()) {
            builder = builder.endpointOverride(URI.create(endpoint));
            // For S3-compatible servers (MinIO) enable path-style addressing
            builder = builder.serviceConfiguration(S3Configuration.builder().pathStyleAccessEnabled(true).build());
        }

        if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
            builder = builder.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)));
        } else {
            builder = builder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return builder.build();
    }

    @Bean
    @ConditionalOnMissingBean
    public S3Presigner s3Presigner(Region awsRegion) {
        var presignerBuilder = S3Presigner.builder().region(awsRegion);

        if (endpoint != null && !endpoint.isBlank()) {
            presignerBuilder = presignerBuilder.endpointOverride(URI.create(endpoint));
        }

        if (accessKey != null && !accessKey.isBlank() && secretKey != null && !secretKey.isBlank()) {
            presignerBuilder = presignerBuilder.credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(accessKey, secretKey)));
        } else {
            presignerBuilder = presignerBuilder.credentialsProvider(DefaultCredentialsProvider.create());
        }

        return presignerBuilder.build();
    }
}