package election.ems_backend.views.repo;

import election.ems_backend.views.entity.CandidateCountyCompare;
import election.ems_backend.views.entity.CandidateCountyCompareId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

@Repository
public interface CandidateCountyCompareRepository extends JpaRepository<CandidateCountyCompare, CandidateCountyCompareId>,
        JpaSpecificationExecutor<CandidateCountyCompare> {
}