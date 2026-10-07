package election.ems_backend.views.controller;

import election.ems_backend.utility.SecurityUtils;
import election.ems_backend.views.dto.DistrictStatsPartyDto;
import election.ems_backend.views.service.DistrictStatsPartyService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * Controller for district-level party stats (v_district_stats_party view).
 */
@RestController
@RequestMapping("/api/stats/party/districts")
@RequiredArgsConstructor
public class DistrictStatsPartyController {

    private final DistrictStatsPartyService service;

    private static final int MAX_PAGE_SIZE = 500;

    @GetMapping
    public ResponseEntity<Page<DistrictStatsPartyDto>> list(
            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
            @RequestParam(value = "electionId") UUID electionId,
            @RequestParam(value = "contestId", required = false) UUID contestId, // ✅ OPTIONAL
            @RequestParam(value = "countyId", required = false) UUID countyId,
            @RequestParam(value = "districtId", required = false) UUID districtId,
            Pageable pageable
    ) {

        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();

        UUID effectiveOrgId = orgIdParam;
        if (derivedOrgId != null) {
            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam)) {
                return ResponseEntity.status(403).build();
            }
            effectiveOrgId = derivedOrgId;
        } else {
            if (effectiveOrgId == null) {
                return ResponseEntity.badRequest().build();
            }
        }

        int requestedSize = pageable.getPageSize();
        int size = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);
        int page = Math.max(0, pageable.getPageNumber());
        Pageable adjusted = PageRequest.of(page, size, pageable.getSort());

        Page<DistrictStatsPartyDto> result = service.listDistrictStats(
                effectiveOrgId,
                electionId,
                contestId,
                countyId,
                districtId,
                adjusted
        );

        return ResponseEntity.ok(result);
    }
}




//package election.ems_backend.views.contro;
//
//import election.ems_backend.utility.SecurityUtils;
//import election.ems_backend.views.dto.DistrictStatsPartyDto;
//import election.ems_backend.views.service.DistrictStatsPartyService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.data.domain.Page;
//import org.springframework.data.domain.PageRequest;
//import org.springframework.data.domain.Pageable;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RequestParam;
//import org.springframework.web.bind.annotation.RestController;
//
//import java.util.UUID;
//
///**
// * Controller for district-level party stats (v_district_stats_party view).
// */
//@RestController
//@RequestMapping("/api/stats/party/districts")
//@RequiredArgsConstructor
//public class DistrictStatsPartyController {
//
//    private final DistrictStatsPartyService service;
//
//    private static final int MAX_PAGE_SIZE = 500;
//
//    @GetMapping
//    public ResponseEntity<Page<DistrictStatsPartyDto>> list(
//            @RequestParam(value = "orgId", required = false) UUID orgIdParam,
//            @RequestParam(value = "electionId") UUID electionId,
//            @RequestParam(value = "contestId", required = false) UUID contestId, // ✅ OPTIONAL
//            @RequestParam(value = "countyId", required = false) UUID countyId,
//            @RequestParam(value = "districtId", required = false) UUID districtId,
//            Pageable pageable
//    ) {
//
//        UUID derivedOrgId = SecurityUtils.getOrgIdFromContext();
//
//        UUID effectiveOrgId = orgIdParam;
//        if (derivedOrgId != null) {
//            if (orgIdParam != null && !derivedOrgId.equals(orgIdParam)) {
//                return ResponseEntity.status(403).build();
//            }
//            effectiveOrgId = derivedOrgId;
//        } else {
//            if (effectiveOrgId == null) {
//                return ResponseEntity.badRequest().build();
//            }
//        }
//
//        int requestedSize = pageable.getPageSize();
//        int size = Math.min(Math.max(1, requestedSize), MAX_PAGE_SIZE);
//        int page = Math.max(0, pageable.getPageNumber());
//        Pageable adjusted = PageRequest.of(page, size, pageable.getSort());
//
//        Page<DistrictStatsPartyDto> result = service.listDistrictStats(
//                effectiveOrgId,
//                electionId,
//                contestId, // ✅ OPTIONAL now supported by service/spec
//                countyId,
//                districtId,
//                adjusted
//        );
//
//        return ResponseEntity.ok(result);
//    }
//}
