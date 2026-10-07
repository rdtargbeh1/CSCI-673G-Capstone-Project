package election.ems_backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an election cannot be found.
 * Mapped to HTTP 404 for controller layers.
 */
@ResponseStatus(HttpStatus.NOT_FOUND)
public class ElectionNotFoundException extends RuntimeException {
    public ElectionNotFoundException(String message) {
        super(message);
    }

    public ElectionNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}