package election.ems_backend.service.implement;

import election.ems_backend.service.FileStorageService;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
 * Local filesystem implementation of FileStorageService.
 *
 * Enabled when:
 *
 * app.storage.provider=local
 *
 * Local is also the default when the property is omitted.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@ConditionalOnProperty(
        name = "app.storage.provider",
        havingValue = "local",
        matchIfMissing = true
)
public class LocalFileStorageService implements FileStorageService {

    @Value("${app.storage.local.base-dir:./uploaded_files}")
    private String baseDir;


    private Path root;


    // =========================================================================
    // INITIALIZE
    // =========================================================================

    @PostConstruct
    public void init() throws IOException {

        root =
                Paths
                        .get(baseDir)
                        .toAbsolutePath()
                        .normalize();


        Files.createDirectories(
                root
        );
    }


    // =========================================================================
    // STORE
    // =========================================================================

    @Override
    public String store(
            String folder,
            String filename,
            InputStream data,
            long size,
            String contentType
    ) throws IOException {

        Path directory =
                root
                        .resolve(
                                folder == null
                                        ? ""
                                        : folder
                        )
                        .normalize();


        ensureInsideRoot(
                directory
        );


        Files.createDirectories(
                directory
        );


        Path destination =
                directory
                        .resolve(
                                filename
                        )
                        .normalize();


        ensureInsideRoot(
                destination
        );


        try (
                OutputStream output =
                        Files.newOutputStream(
                                destination,
                                StandardOpenOption.CREATE,
                                StandardOpenOption.TRUNCATE_EXISTING
                        )
        ) {

            data.transferTo(
                    output
            );
        }


        return destination
                .toUri()
                .toString();
    }


    // =========================================================================
    // READ
    // =========================================================================

    @Override
    public byte[] read(
            String fileUrlOrKey
    ) throws IOException {

        Path path =
                resolveStoredPath(
                        fileUrlOrKey
                );


        if (
                !Files.exists(
                        path
                )
        ) {

            throw new IOException(
                    "Stored file does not exist"
            );
        }


        if (
                !Files.isRegularFile(
                        path
                )
        ) {

            throw new IOException(
                    "Stored path is not a file"
            );
        }


        return Files.readAllBytes(
                path
        );
    }


    // =========================================================================
    // DELETE
    // =========================================================================

    @Override
    public void delete(
            String fileUrlOrKey
    ) {

        if (
                fileUrlOrKey == null ||
                        fileUrlOrKey.isBlank()
        ) {
            return;
        }


        try {

            Path path =
                    resolveStoredPath(
                            fileUrlOrKey
                    );


            Files.deleteIfExists(
                    path
            );

        } catch (
                Exception ex
        ) {

            log.warn(
                    "Failed to delete local file '{}': {}",
                    fileUrlOrKey,
                    ex.getMessage()
            );
        }
    }


    // =========================================================================
    // PROVIDER
    // =========================================================================

    @Override
    public String getProviderName() {
        return "LOCAL";
    }


    // =========================================================================
    // PATH RESOLUTION
    // =========================================================================

    private Path resolveStoredPath(
            String fileUrlOrKey
    ) throws IOException {

        if (
                fileUrlOrKey == null ||
                        fileUrlOrKey.isBlank()
        ) {

            throw new IOException(
                    "Storage location is required"
            );
        }


        Path path;


        if (
                fileUrlOrKey.startsWith(
                        "file:"
                )
        ) {

            try {

                URI uri =
                        URI.create(
                                fileUrlOrKey
                        );


                path =
                        Paths
                                .get(
                                        uri
                                )
                                .toAbsolutePath()
                                .normalize();

            } catch (
                    Exception ex
            ) {

                throw new IOException(
                        "Invalid local file URI",
                        ex
                );
            }

        } else {

            Path candidate =
                    Paths
                            .get(
                                    fileUrlOrKey
                            );


            if (
                    candidate.isAbsolute()
            ) {

                path =
                        candidate
                                .normalize();

            } else {

                path =
                        root
                                .resolve(
                                        candidate
                                )
                                .normalize();
            }
        }


        ensureInsideRoot(
                path
        );


        return path;
    }


    // =========================================================================
    // ROOT GUARD
    // =========================================================================

    private void ensureInsideRoot(
            Path path
    ) throws IOException {

        if (
                path == null ||
                        !path
                                .normalize()
                                .startsWith(
                                        root
                                )
        ) {

            throw new IOException(
                    "Invalid storage path"
            );
        }
    }
}