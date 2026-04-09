package election.ems_backend.repository;

import election.ems_backend.entity.VoteTally;
import jakarta.transaction.Transactional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface VoteTallyRepository
        extends JpaRepository<VoteTally, UUID>, JpaSpecificationExecutor<VoteTally> {


    @Modifying
    @Transactional
    @Query("""
           delete from VoteTally v
           where v.organization.orgId = :orgId
             and v.election.electionId = :electionId
           """)
    void deleteByOrgAndElection(@Param("orgId") UUID orgId,
                                @Param("electionId") UUID electionId);

    @Query("""
           select coalesce(sum(v.voteCount), 0)
           from VoteTally v
           where v.organization.orgId = :orgId
             and v.election.electionId = :electionId
           """)
    long sumVotesByElection(@Param("orgId") UUID orgId,
                            @Param("electionId") UUID electionId);

    List<VoteTally> findByOrganization_OrgIdAndElection_ElectionId(
            UUID orgId,
            UUID electionId
    );



}