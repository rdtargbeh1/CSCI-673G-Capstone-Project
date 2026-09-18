package election.ems_backend.repository;

import election.ems_backend.entity.OrgSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrgSettingRepository extends JpaRepository<OrgSetting, UUID> {

    Optional<OrgSetting> findByOrganization_OrgId(UUID orgId);

    /**
     * Readiness: Is submissions enabled for this org?
     * ✅ Used by Overview -> "Submissions enabled"
     *
     * Assumes settings JSONB contains: { "submissionsEnabled": true }
     *
     * IMPORTANT:
     * - Return Boolean (wrapper) to avoid null->primitive crashes if row missing.
     */
    @Query(value = """
            select coalesce((os.settings ->> 'submissionsEnabled')::boolean, false)
            from org_setting os
            where os.org_id = :orgId
            """, nativeQuery = true)
    Boolean isSubmissionsEnabled(@Param("orgId") UUID orgId);

    /**
     * Readiness: Election-scoped submissions enabled for this org.
     * ✅ Used by Overview when flag is per-election.
     */
    @Query(value = """
            select coalesce(
                (os.settings -> 'elections' -> cast(:electionId as text) ->> 'submissionsEnabled')::boolean,
                false
            )
            from org_setting os
            where os.org_id = :orgId
            """, nativeQuery = true)
    Boolean isSubmissionsEnabledForElection(
            @Param("orgId") UUID orgId,
            @Param("electionId") UUID electionId
    );


//    Optional<OrgSetting> findByOrganization_OrgId(UUID orgId);
//
//    /**
//     * Readiness: Is submissions enabled for this org?
//     * ✅ Used by Overview -> "Submissions enabled"
//     *
//     * Assumes settings JSONB contains: { "submissionsEnabled": true }
//     */
//    @Query(value = """
//            select coalesce((os.settings ->> 'submissionsEnabled')::boolean, false)
//            from org_setting os
//            where os.org_id = :orgId
//            """, nativeQuery = true)
//    boolean isSubmissionsEnabled(@Param("orgId") UUID orgId);
//
//
//    /**
//     * Readiness: Election-scoped submissions enabled for this org.
//     * ✅ Used by Overview when flag is per-election.
//     */
//    @Query(value = """
//            select coalesce(
//            (os.settings -> 'elections' -> cast(:electionId as text) ->>
//            'submissionsEnabled')::boolean,
//            false
//            )
//          from org_setting o
//          where os.org_id = :orgId
//          """, nativeQuery = true)
//    boolean isSubmissionsEnabledForElection(
//            @Param("orgId") UUID orgId,
//            @Param("electionId") UUID electionId
//    );


}
