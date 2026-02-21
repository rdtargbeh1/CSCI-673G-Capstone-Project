
package election.ems_backend.views.service;

import election.ems_backend.views.CenterCoveragePartySpecs;
import election.ems_backend.views.dto.CenterCoveragePartyDto;
import election.ems_backend.views.entity.CenterCoverageParty;
import election.ems_backend.views.mapper.CenterCoveragePartyMapper;
import election.ems_backend.views.repo.CenterCoveragePartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CenterCoveragePartyService {

    private final CenterCoveragePartyRepository repo;
    private final CenterCoveragePartyMapper mapper = new CenterCoveragePartyMapper();

    public Page<CenterCoveragePartyDto> list(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID centerId,
            Boolean started,
            Boolean completed,
            Pageable pageable
    ) {

        Specification<CenterCoverageParty> spec =
                Specification.where(CenterCoveragePartySpecs.orgId(orgId))
                        .and(CenterCoveragePartySpecs.electionId(electionId))
                        .and(CenterCoveragePartySpecs.contestId(contestId))
                        .and(CenterCoveragePartySpecs.centerId(centerId))
                        .and(CenterCoveragePartySpecs.started(started))
                        .and(CenterCoveragePartySpecs.completed(completed));

        return repo.findAll(spec, pageable).map(mapper::toDto);
    }
}
