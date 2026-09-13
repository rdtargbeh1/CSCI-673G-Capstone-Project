package election.ems_backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.kms.KmsClient;


@Configuration
public class AwsConfig {

    @Value("${cloud.aws.region:us-east-1}")
    private String awsRegion;

    @Bean
    public KmsClient kmsClient() {
        return KmsClient.builder()
                .region(Region.of(awsRegion))
                .build();
    }

}