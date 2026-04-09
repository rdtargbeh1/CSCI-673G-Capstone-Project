package election.ems_backend.repository;

import election.ems_backend.entity.Organization;
import election.ems_backend.enums.OrganizationType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {

    Optional<Organization> findBySubdomainIgnoreCase(String subdomain);

    boolean existsBySubdomainIgnoreCase(String subdomain);

    boolean existsBySubdomainIgnoreCaseAndOrgIdNot(String subdomain, UUID orgId);

//    boolean existsByParty_PartyId(UUID partyId);

    boolean existsByOrgIdAndIsActiveTrue(UUID orgId);


//    Optional<UUID> findIdBySubdomainIgnoreCaseAndIsActiveTrue(String subdomain);

    @Query("select o.orgId from Organization o where lower(o.subdomain) = lower(?1) and o.isActive = true")
    Optional<UUID> findIdBySubdomainIgnoreCaseAndIsActiveTrue(String subdomain);


    @Query("""
       select o
       from Organization o
       where (:pattern is null or
              lower(o.orgName)   like :pattern
              or lower(o.subdomain) like :pattern)
         and (:active is null or o.isActive = :active)
         and (:type is null or o.organizationType = :type)
       """)
    Page<Organization> search(@Param("pattern") String pattern,
                              @Param("active") Boolean active,
                              @Param("type") OrganizationType type,
                              Pageable pageable);





}
