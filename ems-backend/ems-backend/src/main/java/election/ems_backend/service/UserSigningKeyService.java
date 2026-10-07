package election.ems_backend.service;

import election.ems_backend.dto.UserSigningKeyCreateRequest;
import election.ems_backend.dto.UserSigningKeyDto;

import java.util.List;
import java.util.UUID;

public interface UserSigningKeyService {
    UserSigningKeyDto createForUser(UUID userId, UserSigningKeyCreateRequest req);

    List<UserSigningKeyDto> listForUser(UUID userId);

    UserSigningKeyDto getById(UUID keyId);

    UserSigningKeyDto revoke(UUID keyId);


}