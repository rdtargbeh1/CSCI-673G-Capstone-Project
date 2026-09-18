package election.ems_backend.views.service;


import election.ems_backend.entity.Election;
import election.ems_backend.exception.ElectionNotFoundException;
import election.ems_backend.repository.ElectionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * Implementation of ElectionValidationService.
 */
@Service
@RequiredArgsConstructor
public class ElectionValidationService {

    private final ElectionRepository electionRepository;


    public void ensureExists(UUID electionId) {
        if (electionId == null) {
            throw new IllegalArgumentException("electionId is required");
        }
        if (!electionRepository.existsById(electionId)) {
            throw new ElectionNotFoundException("Election not found: " + electionId);
        }
    }


    public Election getExisting(UUID electionId) {
        return electionRepository.findById(electionId)
                .orElseThrow(() -> new ElectionNotFoundException("Election not found: " + electionId));
    }
}