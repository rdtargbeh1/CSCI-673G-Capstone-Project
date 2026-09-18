package election.ems_backend.controller;

import election.ems_backend.dto.CountyDto;
import election.ems_backend.dto.CountyRequest;
import election.ems_backend.security.AuthorizationService;
import election.ems_backend.service.CountyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/counties")
@RequiredArgsConstructor
public class CountyController {

    private final CountyService service;
    private final AuthorizationService authz;

    @PostMapping
    public ResponseEntity<CountyDto> create(
            @RequestBody @Valid CountyRequest req
    ) {
        authz.requireNecAdminOrPlatformAdmin();

        return ResponseEntity.ok(
                service.create(req)
        );
    }

    @PutMapping("/{countyId}")
    public ResponseEntity<CountyDto> update(
            @PathVariable("countyId") UUID countyId,
            @RequestBody @Valid CountyRequest req
    ) {
        authz.requireNecAdminOrPlatformAdmin();

        return ResponseEntity.ok(
                service.update(
                        countyId,
                        req
                )
        );
    }

    @DeleteMapping("/{countyId}")
    public ResponseEntity<Void> delete(
            @PathVariable("countyId") UUID countyId
    ) {
        authz.requireNecAdminOrPlatformAdmin();

        service.delete(countyId);

        return ResponseEntity
                .noContent()
                .build();
    }

    @GetMapping("/{countyId}")
    public ResponseEntity<CountyDto> get(
            @PathVariable("countyId") UUID countyId,

            @RequestParam(
                    value = "electionId",
                    required = false
            ) UUID electionId
    ) {
        return ResponseEntity.ok(
                service.get(
                        countyId,
                        electionId
                )
        );
    }

    @GetMapping
    public ResponseEntity<Page<CountyDto>> list(
            @RequestParam(
                    value = "q",
                    required = false
            ) String q,

            @RequestParam(
                    value = "electionId",
                    required = false
            ) UUID electionId,

            Pageable pageable
    ) {
        return ResponseEntity.ok(
                service.list(
                        q,
                        electionId,
                        pageable
                )
        );
    }
}