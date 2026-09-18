package election.ems_backend.repository;

import election.ems_backend.entity.UserMfa;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserMfaRepository extends JpaRepository<UserMfa, UUID> {
    Optional<UserMfa> findByUser_UserId(UUID userId);
}