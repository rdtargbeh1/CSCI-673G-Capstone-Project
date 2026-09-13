package election.ems_backend.mapper;

import election.ems_backend.dto.UserSigningKeyDto;
import election.ems_backend.entity.UserSigningKey;
import org.springframework.stereotype.Component;

@Component
public class UserSigningKeyMapper {

    public UserSigningKeyDto toDto(UserSigningKey e) {
        if (e == null) return null;
        return UserSigningKeyDto.builder()
                .keyId(e.getKeyId())
                .userId(e.getUser() != null ? e.getUser().getUserId() : null)
                .kid(e.getKid())
                .publicKey(e.getPublicKey())
                .algorithm(e.getAlgorithm())
                .revoked(e.isRevoked())
                .dateRevoked(e.getDateRevoked())
                .dateCreated(e.getDateCreated())
                .metadata(e.getMetadata())
                .build();
    }
}