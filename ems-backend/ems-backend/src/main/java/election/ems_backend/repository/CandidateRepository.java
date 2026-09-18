package election.ems_backend.repository;

import election.ems_backend.entity.Candidate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface CandidateRepository extends JpaRepository<Candidate, UUID>, JpaSpecificationExecutor<Candidate> {

    boolean existsByFullNameIgnoreCaseAndParty_PartyId(String fullName, UUID partyId);

    boolean existsByFullNameIgnoreCaseAndPartyIsNull(String fullName);
}
