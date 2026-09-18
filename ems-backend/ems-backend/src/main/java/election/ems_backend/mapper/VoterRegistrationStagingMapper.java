package election.ems_backend.mapper;

import election.ems_backend.dto.VoterRegistrationStagingDto;
import election.ems_backend.entity.VoterRegistrationStaging;
import org.springframework.stereotype.Component;

@Component
public class VoterRegistrationStagingMapper {

    public VoterRegistrationStagingDto toDto(VoterRegistrationStaging s) {
        if (s == null) return null;
        VoterRegistrationStagingDto d = new VoterRegistrationStagingDto();
        d.setStagingId(s.getStagingId());
        d.setBatchId(s.getBatchId());
        d.setNationalId(s.getNationalId());
        d.setFullName(s.getFullName());
        d.setDob(s.getDob());
        d.setAssignedCenterCode(s.getAssignedCenterCode());
        d.setImportedBy(s.getImportedBy() != null ? s.getImportedBy().getUserId() : null);
        d.setImportTime(s.getImportTime());
        d.setValidated(s.getValidated());
        d.setValidationErrors(s.getValidationErrors());
        d.setValidatedBy(s.getValidatedBy() != null ? s.getValidatedBy().getUserId() : null);
        d.setValidatedAt(s.getValidatedAt());
        d.setProcessed(s.getProcessed());
        d.setProcessedBy(s.getProcessedBy() != null ? s.getProcessedBy().getUserId() : null);
        d.setProcessedAt(s.getProcessedAt());
        d.setProcessedVoterId(s.getProcessedVoterId());
        return d;
    }
}
