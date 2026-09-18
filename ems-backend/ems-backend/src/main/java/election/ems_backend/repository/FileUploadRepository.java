package election.ems_backend.repository;

import election.ems_backend.entity.FileUpload;
import election.ems_backend.enums.FileType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;


@Repository
public interface FileUploadRepository
        extends JpaRepository<FileUpload, UUID>,
        JpaSpecificationExecutor<FileUpload> {


    // =========================================================================
    // LIST ACTIVE FILES FOR ENTITY
    // =========================================================================

    @Query("""
            SELECT f
            FROM FileUpload f
            WHERE f.organization.orgId = :orgId
              AND f.relatedTable = :table
              AND f.relatedId = :relatedId
              AND f.dateDeleted IS NULL
            ORDER BY f.dateUpdated DESC
            """)
    List<FileUpload> listActive(
            @Param("orgId") UUID orgId,
            @Param("table") String relatedTable,
            @Param("relatedId") UUID relatedId
    );


    // =========================================================================
    // EXISTING ORGANIZATION-WIDE LOOKUPS
    //
    // Retained because other existing code may still use them.
    //
    // Generic multipart upload MUST NOT use these to decide whether two
    // different entities may use the same physical image.
    // =========================================================================

    @Query("""
            SELECT CASE WHEN COUNT(f) > 0 THEN TRUE ELSE FALSE END
            FROM FileUpload f
            WHERE f.organization.orgId = :orgId
              AND f.sha256 = :sha
              AND f.dateDeleted IS NULL
            """)
    boolean existsActiveByOrgAndSha(
            @Param("orgId") UUID orgId,
            @Param("sha") String sha
    );


    @Query("""
            SELECT f
            FROM FileUpload f
            WHERE f.organization.orgId = :orgId
              AND f.sha256 = :sha
              AND f.dateDeleted IS NULL
            """)
    Optional<FileUpload> findActiveByOrgAndSha(
            @Param("orgId") UUID orgId,
            @Param("sha") String sha
    );


    // =========================================================================
    // EXACT TENANT ENTITY DUPLICATE
    //
    // Duplicate identity:
    //
    // org
    // + relatedTable
    // + relatedId
    // + fileType
    // + sha256
    //
    // Same image used by another entity is valid.
    // =========================================================================

    @Query("""
            SELECT f
            FROM FileUpload f
            WHERE f.organization.orgId = :orgId
              AND f.relatedTable = :relatedTable
              AND f.relatedId = :relatedId
              AND f.fileType = :fileType
              AND f.sha256 = :sha
              AND f.dateDeleted IS NULL
            ORDER BY f.dateUpdated DESC
            """)
    List<FileUpload> findActiveExactEntityDuplicate(
            @Param("orgId") UUID orgId,
            @Param("relatedTable") String relatedTable,
            @Param("relatedId") UUID relatedId,
            @Param("fileType") FileType fileType,
            @Param("sha") String sha
    );


    // =========================================================================
    // EXISTING PLATFORM-WIDE LOOKUPS
    //
    // Retained for compatibility with existing code.
    // =========================================================================

    @Query("""
            SELECT CASE WHEN COUNT(f) > 0 THEN TRUE ELSE FALSE END
            FROM FileUpload f
            WHERE f.organization IS NULL
              AND f.sha256 = :sha
              AND f.dateDeleted IS NULL
            """)
    boolean existsActivePlatformBySha(
            @Param("sha") String sha
    );


    @Query("""
            SELECT f
            FROM FileUpload f
            WHERE f.organization IS NULL
              AND f.sha256 = :sha
              AND f.dateDeleted IS NULL
            """)
    Optional<FileUpload> findActivePlatformBySha(
            @Param("sha") String sha
    );


    // =========================================================================
    // EXACT PLATFORM ENTITY DUPLICATE
    // =========================================================================

    @Query("""
            SELECT f
            FROM FileUpload f
            WHERE f.organization IS NULL
              AND f.relatedTable = :relatedTable
              AND f.relatedId = :relatedId
              AND f.fileType = :fileType
              AND f.sha256 = :sha
              AND f.dateDeleted IS NULL
            ORDER BY f.dateUpdated DESC
            """)
    List<FileUpload> findActiveExactPlatformEntityDuplicate(
            @Param("relatedTable") String relatedTable,
            @Param("relatedId") UUID relatedId,
            @Param("fileType") FileType fileType,
            @Param("sha") String sha
    );
}