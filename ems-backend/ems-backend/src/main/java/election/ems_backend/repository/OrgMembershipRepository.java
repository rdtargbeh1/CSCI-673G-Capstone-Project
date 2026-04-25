package election.ems_backend.repository;

import election.ems_backend.entity.OrgMembership;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrgMembershipRepository extends JpaRepository<OrgMembership, UUID> {

    /** Check membership existence for tenant-guarded operations. */
    boolean existsByOrganization_OrgIdAndUser_UserId(UUID orgId, UUID userId);

    /** Load a specific membership (e.g., to change org-scoped roleName). */
    Optional<OrgMembership> findByOrganization_OrgIdAndUser_UserId(UUID orgId, UUID userId);

    Optional<OrgMembership> findByOrganization_OrgIdAndUser_UserIdAndIsEnabledTrue(UUID orgId, UUID userId);

    long countByUser_UserId(UUID userId);

    @Query("""
       select m
       from OrgMembership m
         join m.user u
       where m.organization.orgId = :org
         and (:pattern is null or
              lower(u.userName)  like :pattern or
              lower(u.firstName) like :pattern or
              lower(u.lastName)  like :pattern or
              lower(u.email)     like :pattern)
         and (:role is null or m.roleName = :role)
         and (:enabled is null or m.isEnabled = :enabled)
       """)
    Page<OrgMembership> searchInOrg(@Param("org") UUID orgId,
                                    @Param("pattern") String pattern,
                                    @Param("role") String roleName,
                                    @Param("enabled") Boolean enabled,
                                    Pageable pageable);



    // Disable Org Member
    @Modifying
    @Query("""
       UPDATE OrgMembership m
       SET m.isEnabled = false
       WHERE m.organization.orgId = :orgId
       """)
    void disableAllForOrg(@Param("orgId") UUID orgId);

    @Query("select count(m) from OrgMembership m where m.organization.orgId = :orgId and upper(m.roleName) = :roleName and m.isEnabled = true")
    long countByOrganization_OrgIdAndRoleNameAndIsEnabledTrue(UUID orgId, String roleName);


    // New ones

    /**
     * ✅ Returns true if the user has an ENABLED membership in the given org.
     *
     * What this does:
     * - Checks org_membership row exists for (orgId, userId)
     * - Ensures is_enabled = true
     *
     * Why:
     * - This is the backend enforcement for: "Only enabled members can access tenant content"
     */
    boolean existsByOrganization_OrgIdAndUser_UserIdAndIsEnabledTrue(UUID orgId, UUID userId);


}
