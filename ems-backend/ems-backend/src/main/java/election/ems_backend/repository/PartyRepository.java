package election.ems_backend.repository;

import election.ems_backend.entity.Party;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface PartyRepository extends JpaRepository<Party, UUID> {

    boolean existsByPartyNameIgnoreCase(String partyName);
    boolean existsByAbbreviationIgnoreCase(String abbreviation);

    boolean existsByPartyNameIgnoreCaseAndPartyIdNot(String partyName, UUID excludeId);
    boolean existsByAbbreviationIgnoreCaseAndPartyIdNot(String abbreviation, UUID excludeId);

    Optional<Party> findByAbbreviationIgnoreCase(String abbreviation);


    @Query("""
       select p from Party p
       where (:pattern is null or
              lower(p.partyName)    like :pattern or
              lower(p.abbreviation) like :pattern)
       order by p.partyName
       """)
    Page<Party> search(@Param("pattern") String pattern, Pageable pageable);




}