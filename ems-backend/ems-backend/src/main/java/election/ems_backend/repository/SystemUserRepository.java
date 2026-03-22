package election.ems_backend.repository;


import election.ems_backend.entity.SystemUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SystemUserRepository extends JpaRepository<SystemUser, UUID>, JpaSpecificationExecutor<SystemUser> {

    Optional<SystemUser> findByEmailIgnoreCase(String email);

    Optional<SystemUser> findByUserNameIgnoreCase(String userName);

    @Query("select coalesce(su.isSystemAdmin, false) from SystemUser su where su.userId = ?1")
    boolean isSystemAdmin(UUID userId);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByUserNameIgnoreCase(String userName);

    /**
     * Returns a page of users who belong to (are members of) the given organization, with optional filters.
     *
     * <p>JPQL breakdown:
     * <ul>
     *   <li><b>from OrgMembership m join m.user u</b> – start from membership rows and join to the user entity.
     *       This guarantees results are scoped to users that actually have a membership entry.</li>
     *   <li><b>m.organization.orgId = :org</b> – restrict to memberships in the specified organization (tenant).</li>
     *   <li><b>m.enabled = true</b> – only members whose membership is currently enabled (no disabled/removed access).</li>
     *   <li><b>:q filter</b> – if a non-null query string is provided, do a case-insensitive match against the user’s
     *       first name, last name, email, or username.</li>
     *   <li><b>:active filter</b> – if provided, also filter by the user’s global active flag.</li>
     * </ul>
     *
     * Notes:
     * <ul>
     *   <li>This query enforces tenant scoping via the membership table (no user outside the org can appear).</li>
     *   <li>The unique constraint on (org_id, user_id) prevents duplicates; otherwise you could add SELECT DISTINCT.</li>
     *   <li>Pagination is handled by Spring Data via the returned {@code Page<SystemUser>}.</li>
     * </ul>
     */
    @Query("""
       select u
       from OrgMembership m
       join m.user u
       where m.organization.orgId = :org
         and m.isEnabled = true
         and (:pattern is null or
              lower(u.firstName) like :pattern or
              lower(u.lastName)  like :pattern or
              lower(u.email)     like :pattern or
              lower(u.userName)  like :pattern)
         and (:active is null or u.isActive = :active)
       """)
    Page<SystemUser> findAllInOrg(@Param("org") UUID orgId,
                                  @Param("pattern") String pattern,
                                  @Param("active") Boolean active,
                                  Pageable pageable);


    @Query("""
        select u
        from SystemUser u
        join u.defaultOrg o
        where u.userId = :id
        and o.orgId = :orgId
        """)
    Optional<SystemUser> findByIdAndOrgId(@Param("id") UUID id, @Param("orgId") UUID orgId);

    @Query("select u from SystemUser u where lower(u.userName) = lower(:username) and u.defaultOrg.orgId = :orgId")
    Optional<SystemUser> findByUsernameAndOrgId(@Param("username") String username, @Param("orgId") UUID orgId);

    // ✅ platform filter by active
    Page<SystemUser> findByIsActive(Boolean isActive, Pageable pageable);

    @Query("""
        select u
        from SystemUser u
        where not exists (
            select 1
            from OrgMembership m
            where m.user = u
              and m.isEnabled = true
        )
        and (:active is null or u.isActive = :active)
        """)
    Page<SystemUser> findPlatformUsersOnly(
            @Param("active") Boolean active,
            Pageable pageable
    );



}