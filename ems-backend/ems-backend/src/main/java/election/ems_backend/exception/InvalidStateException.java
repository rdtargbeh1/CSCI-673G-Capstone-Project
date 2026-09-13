package election.ems_backend.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when an operation cannot be performed due to invalid entity state.
 * Mapped to HTTP 409 Conflict.
 */
@ResponseStatus(HttpStatus.CONFLICT)
public class InvalidStateException extends RuntimeException {

    public InvalidStateException(String message) {
        super(message);
    }

    public InvalidStateException(String message, Throwable cause) {
        super(message, cause);
    }
}