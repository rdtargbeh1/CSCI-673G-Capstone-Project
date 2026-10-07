package election.ems_backend.service.implement;

import election.ems_backend.dto.VoterPublicDto;
import election.ems_backend.entity.VoterRegistrationPublic;
import election.ems_backend.repository.VoterRegistrationPublicRepository;
import election.ems_backend.service.AuditLogService;
import election.ems_backend.service.VoterRollService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VoterRollServiceImplementation implements VoterRollService {

    private final JdbcTemplate jdbc;
    private final VoterRegistrationPublicRepository publicRepo;
    private final AuditLogService auditLogService;


    @Override
    @Transactional
    // NEC-only operation: ensure controller or method security enforces ROLE_NEC
    public int publishRoll(UUID electionId, UUID actorUserId) {
        // Remove any existing snapshot rows for target election
        jdbc.update("DELETE FROM voter_registration_public WHERE election_id = ?", electionId);

        // Bulk insert allowed fields from internal table into public snapshot.
        // NOTE: convert_from(encrypted_full_name, 'UTF8') is a placeholder that only works if
        // encrypted_full_name actually contains plaintext bytes; in production decrypt in app
        // and use batched inserts to avoid exposing encryption keys in SQL.
        String insertSql =
                "INSERT INTO voter_registration_public (voter_id, election_id, voter_card_id, full_name, picture_url, county_id, district_id, assigned_center_id, polling_place, registration_status, date_published) " +
                        "SELECT voter_id, election_id, voter_card_id, convert_from(encrypted_full_name, 'UTF8')::text AS full_name, picture_url, county_id, district_id, assigned_center_id, polling_place, registration_status, now() " +
                        "FROM voter_registration WHERE election_id = ? AND registration_status = 'REGISTERED'";

        int rows = jdbc.update(insertSql, electionId);

        // Audit the publish action (best-effort)
        try {
            auditLogService.logCreate(null, actorUserId, "VoterRegistrationPublic",
                    "Published voter roll for election=" + electionId + " rows=" + rows);
        } catch (Exception ex) {
            // do not fail the publish on audit errors
        }
        return rows;
    }


    @Override
    @Transactional
    public void unpublishRoll(UUID electionId, UUID actorUserId) {
        int rows = jdbc.update("DELETE FROM voter_registration_public WHERE election_id = ?", electionId);

        try {
            auditLogService.logDelete(null, actorUserId, "VoterRegistrationPublic",
                    "Unpublished voter roll for election=" + electionId + " rows_removed=" + rows);
        } catch (Exception ex) {
            // best-effort
        }
    }



    @Override
    @Transactional(readOnly = true)
    public Page<VoterPublicDto> searchPublicRoll(UUID electionId, UUID countyId, UUID districtId, UUID centerId, String place, Pageable pageable) {
        Page<VoterRegistrationPublic> page = publicRepo.search(electionId, countyId, districtId, centerId, place, pageable);
        return page.map(this::toDto);
    }

    private VoterPublicDto toDto(VoterRegistrationPublic v) {
        VoterPublicDto d = new VoterPublicDto();
        d.setVoterId(v.getVoterId());
        d.setVoterCardId(v.getVoterCardId());
        d.setElectionId(v.getElectionId());
        d.setFullName(v.getFullName());
        d.setPictureUrl(v.getPictureUrl());
        d.setCountyId(v.getCountyId());
        d.setDistrictId(v.getDistrictId());
        d.setAssignedCenterId(v.getAssignedCenterId());
        d.setPollingPlace(v.getPollingPlace());
        d.setRegistrationStatus(v.getRegistrationStatus());
        d.setDatePublished(v.getDatePublished());
        return d;
    }
}