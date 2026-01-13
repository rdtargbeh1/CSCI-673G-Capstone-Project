package election.ems_backend.repository;

import election.ems_backend.entity.UserSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface UserSessionRepository extends JpaRepository<UserSession, UUID> {

    List<UserSession> findByUser_UserId(UUID userId);

    List<UserSession> findByOrganization_OrgId(UUID orgId);

    @Query("SELECT s FROM UserSession s WHERE s.user.userId = :userId AND s.revoked = false AND s.expiresDate > CURRENT_TIMESTAMP")
    List<UserSession> findActiveSessions(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE UserSession s SET s.revoked = true WHERE s.user.userId = :userId")
    void revokeAllByUserId(@Param("userId") UUID userId);

    @Modifying
    @Query("UPDATE UserSession s SET s.revoked = true WHERE s.sessionId = :sessionId")
    void revokeById(@Param("sessionId") UUID sessionId);


    // User Session
    @Modifying
    @Query("""
       UPDATE UserSession s
       SET s.revoked = true
       WHERE s.organization.orgId = :orgId
       """)
    void revokeAllForOrg(@Param("orgId") UUID orgId);



}