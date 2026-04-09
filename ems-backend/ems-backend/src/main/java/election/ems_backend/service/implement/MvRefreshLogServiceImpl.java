package election.ems_backend.service.implement;


import election.ems_backend.entity.MvRefreshLog;
import election.ems_backend.enums.RefreshStatus;
import election.ems_backend.repository.MvRefreshLogRepository;
import election.ems_backend.service.MvRefreshLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Simple service to update mv_refresh_log rows.
 * Call markStart() before refreshing (optional) and markFinish() after refresh completes.
 */
@Service
@RequiredArgsConstructor
public class MvRefreshLogServiceImpl implements MvRefreshLogService {

    private final MvRefreshLogRepository repo;

    @Override
    @Transactional
    public void markStart(String mvName) {
        MvRefreshLog r = repo.findById(mvName).orElseGet(() -> {
            MvRefreshLog n = new MvRefreshLog();
            n.setMvName(mvName);
            return n;
        });
        r.setStatus(RefreshStatus.RUNNING);
        r.setLastRefreshed(LocalDateTime.now());
        r.setDurationMs(null);
        r.setNotes(null);
        repo.save(r);
    }

    @Override
    @Transactional
    public void markFinish(String mvName, long durationMs, RefreshStatus status, String notes) {
        MvRefreshLog r = repo.findById(mvName).orElseGet(() -> {
            MvRefreshLog n = new MvRefreshLog();
            n.setMvName(mvName);
            return n;
        });
        r.setLastRefreshed(LocalDateTime.now());
        r.setDurationMs(durationMs);
        r.setStatus(status);
        r.setNotes(notes);
        repo.save(r);
    }
}