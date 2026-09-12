package election.ems_backend.views.service;

import election.ems_backend.views.PlaceCoveragePartySpecs;
import election.ems_backend.views.dto.PlaceCoveragePartyDto;
import election.ems_backend.views.entity.PlaceCoverageParty;
import election.ems_backend.views.mapper.PlaceCoveragePartyMapper;
import election.ems_backend.views.repository.PlaceCoveragePartyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PlaceCoveragePartyService {

    private final PlaceCoveragePartyRepository repo;
    private final PlaceCoveragePartyMapper mapper = new PlaceCoveragePartyMapper();

    public Page<PlaceCoveragePartyDto> list(
            UUID orgId,
            UUID electionId,
            UUID contestId,
            UUID centerId,
            UUID placeId,
            Boolean reported,
            Pageable pageable
    ) {

        Specification<PlaceCoverageParty> spec =
                Specification.where(PlaceCoveragePartySpecs.orgId(orgId))
                        .and(PlaceCoveragePartySpecs.electionId(electionId))
                        .and(PlaceCoveragePartySpecs.contestId(contestId))
                        .and(PlaceCoveragePartySpecs.centerId(centerId))
                        .and(PlaceCoveragePartySpecs.placeId(placeId))
                        .and(PlaceCoveragePartySpecs.isPlaceReported(reported));

        return repo.findAll(spec, pageable).map(mapper::toDto);
    }
}
