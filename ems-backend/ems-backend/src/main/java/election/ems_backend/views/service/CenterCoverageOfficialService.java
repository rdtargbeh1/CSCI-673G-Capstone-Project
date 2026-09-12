package election.ems_backend.views.service;


import election.ems_backend.views.CenterCoverageOfficialSpecs;
import election.ems_backend.views.dto.CenterCoverageOfficialDto;
import election.ems_backend.views.entity.CenterCoverageOfficial;
import election.ems_backend.views.mapper.CenterCoverageOfficialMapper;
import election.ems_backend.views.repo.CenterCoverageOfficialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CenterCoverageOfficialService {

    private final CenterCoverageOfficialRepository repo;
    private final CenterCoverageOfficialMapper mapper = new CenterCoverageOfficialMapper();

    public Page<CenterCoverageOfficialDto> list(
            UUID electionId,
            UUID contestId,
            UUID centerId,
            Boolean started,
            Boolean completed,
            Pageable pageable
    ) {
        Specification<CenterCoverageOfficial> spec =
                Specification.where(CenterCoverageOfficialSpecs.electionId(electionId))
                        .and(CenterCoverageOfficialSpecs.contestId(contestId))
                        .and(CenterCoverageOfficialSpecs.centerId(centerId))
                        .and(CenterCoverageOfficialSpecs.started(started))
                        .and(CenterCoverageOfficialSpecs.completed(completed));

        return repo.findAll(spec, pageable).map(mapper::toDto);
    }
}
