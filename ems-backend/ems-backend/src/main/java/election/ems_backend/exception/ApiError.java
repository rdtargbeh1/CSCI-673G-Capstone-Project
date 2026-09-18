package election.ems_backend.exception;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;

import java.time.OffsetDateTime;
import java.util.Map;

@Getter
@AllArgsConstructor
@Builder
public class ApiError {
    private final OffsetDateTime timestamp;
    private final int status;                 // HTTP status code
    private final String error;               // stable short code (e.g., VALIDATION_ERROR)
    private final String message;             // human message
    private final String path;                // request URI
    private final String rid;                 // request id (from MDC, for tracing)
    private final Map<String, String> fieldErrors; // optional field -> error (for validation)
}