package election.ems_backend.repository;

import election.ems_backend.entity.UserSigningKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserSigningKeyRepository extends JpaRepository<UserSigningKey, UUID> {

    List<UserSigningKey> findByUser_UserIdOrderByDateCreatedDesc(UUID userId);

    Optional<UserSigningKey> findByKid(String kid);

    List<UserSigningKey> findByUserUserIdOrderByDateCreatedDesc(UUID userId);

}