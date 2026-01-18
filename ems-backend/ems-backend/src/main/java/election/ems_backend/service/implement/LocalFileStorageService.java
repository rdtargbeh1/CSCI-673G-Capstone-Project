package election.ems_backend.service.implement;

import election.ems_backend.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URI;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;

/**
 * Local file storage for dev. Implements FileStorageService fully so it compiles
 * where the interface expects delete() and getProviderName().
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class LocalFileStorageService implements FileStorageService {

    @Value("${app.storage.local.base-dir:./uploaded_files}")
    private String baseDir;

    private Path root;

    @PostConstruct
    public void init() throws IOException {
        root = Paths.get(baseDir).toAbsolutePath().normalize();
        Files.createDirectories(root);
    }

    @Override
    public String store(String folder, String filename, InputStream data, long size, String contentType) throws IOException {
        Path dir = root.resolve(folder == null ? "" : folder);
        Files.createDirectories(dir);
        Path dest = dir.resolve(filename);
        try (OutputStream out = Files.newOutputStream(dest, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
            data.transferTo(out);
        }
        // return a file:// URI for compatibility with existing code
        return dest.toUri().toString();
    }

    @Override
    public void delete(String fileUrlOrKey) {
        if (fileUrlOrKey == null || fileUrlOrKey.isBlank()) return;
        try {
            Path p;
            // if the stored value is a file:// URI, parse it
            if (fileUrlOrKey.startsWith("file:")) {
                URI uri = URI.create(fileUrlOrKey);
                p = Paths.get(uri).toAbsolutePath().normalize();
            } else {
                // assume it's a path relative to base dir or an absolute path
                Path candidate = Paths.get(fileUrlOrKey);
                if (!candidate.isAbsolute()) {
                    p = root.resolve(candidate).normalize();
                } else {
                    p = candidate.normalize();
                }
            }
            Files.deleteIfExists(p);
        } catch (Exception ex) {
            // best-effort: log and continue (do not throw from cleanup)
            log.warn("Failed to delete local file '{}': {}", fileUrlOrKey, ex.getMessage());
        }
    }

    @Override
    public String getProviderName() {
        return "LOCAL";
    }

    // presignUpload left as default (unsupported) — override if you want local presign behavior
}
