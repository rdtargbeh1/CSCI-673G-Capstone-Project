package election.ems_backend.service.implement;


import election.ems_backend.service.ReportStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

/**
 * Local filesystem storage (dev/test).
 */
@Service
@ConditionalOnProperty(name = "reports.storage", havingValue = "filesystem", matchIfMissing = true)
public class FileSystemReportStorageService implements ReportStorageService {

    @Value("${reports.filesystem.path:./data/reports}")
    private String storagePath;

    @Override
    public String store(File file, String filename) throws Exception {
        Path base = Path.of(storagePath);
        Files.createDirectories(base);
        String key = UUID.randomUUID() + "-" + filename;
        Path dest = base.resolve(key);
        Files.copy(file.toPath(), dest);
        return dest.toAbsolutePath().toString();
    }

    @Override
    public byte[] fetch(String storageUri) throws Exception {
        Path p = Path.of(storageUri);
        return Files.readAllBytes(p);
    }

    @Override
    public String presign(String storageUri, long ttlSeconds) {
        // Not supported for filesystem
        return null;
    }
}