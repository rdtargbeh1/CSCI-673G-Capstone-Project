package election.ems_backend.repository;

import election.ems_backend.entity.FileUpload;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface FileUploadRepository extends JpaRepository<FileUpload, UUID>, JpaSpecificationExecutor<FileUpload> {

    @Query("select f from FileUpload f " +
            "where f.organization.orgId = :orgId and f.relatedTable = :table and f.relatedId = :relatedId " +
            "and f.dateDeleted is null " +
            "order by f.dateUpdated desc")
    List<FileUpload> listActive(@Param("orgId") UUID orgId,
                                @Param("table") String relatedTable,
                                @Param("relatedId") UUID relatedId);

    @Query("select (count(f) > 0) from FileUpload f " +
            "where f.organization.orgId = :orgId and f.sha256 = :sha and f.dateDeleted is null")
    boolean existsActiveByOrgAndSha(@Param("orgId") UUID orgId, @Param("sha") String sha);

    @Query("""
           SELECT f FROM FileUpload f
           WHERE f.organization.orgId = :orgId
             AND f.sha256 = :sha
             AND f.dateDeleted IS NULL
           """)
    Optional<FileUpload> findActiveByOrgAndSha(@Param("orgId") UUID orgId, @Param("sha") String sha);
}
