package election.ems_backend.repository;

import election.ems_backend.entity.ChatRoomDm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ChatRoomDmRepository extends JpaRepository<ChatRoomDm, UUID> {

    // Exact pair (user1,user2) — call with canonical order from service
    Optional<ChatRoomDm> findByOrganization_OrgIdAndUser1_UserIdAndUser2_UserId(
            UUID orgId, UUID user1Id, UUID user2Id
    );

    // List my DMs (two sides, merge in service)
    List<ChatRoomDm> findByOrganization_OrgIdAndUser1_UserId(UUID orgId, UUID userId);

    List<ChatRoomDm> findByOrganization_OrgIdAndUser2_UserId(UUID orgId, UUID userId);
}