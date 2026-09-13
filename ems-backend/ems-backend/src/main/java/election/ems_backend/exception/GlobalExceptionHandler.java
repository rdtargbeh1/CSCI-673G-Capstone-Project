package election.ems_backend.exception;


import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Global exception handler to ensure consistent JSON error responses.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> handleBadRequest(IllegalArgumentException ex) {
        log.debug("Bad request: {}", ex.getMessage());
        Map<String, String> m = new HashMap<>();
        m.put("error", "bad_request");
        m.put("message", ex.getMessage());
        return m;
    }

    @ExceptionHandler(ElectionNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> handleElectionNotFound(ElectionNotFoundException ex) {
        log.debug("Election not found: {}", ex.getMessage());
        Map<String, String> m = new HashMap<>();
        m.put("error", "not_found");
        m.put("message", ex.getMessage());
        return m;
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> handleAccessDenied(AccessDeniedException ex) {
        log.warn("Access denied: {}", ex.getMessage());
        Map<String, String> m = new HashMap<>();
        m.put("error", "forbidden");
        m.put("message", ex.getMessage());
        return m;
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, String> handleOther(Exception ex) {
        log.error("Unexpected error", ex);
        Map<String, String> m = new HashMap<>();
        m.put("error", "internal_server_error");
        m.put("message", "An unexpected error occurred");
        return m;
    }


    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<?> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 400);
        body.put("message", "Validation failed");

        Map<String, String> details = new LinkedHashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> details.put(err.getField(), err.getDefaultMessage()));

        body.put("details", details);
        return ResponseEntity.badRequest().body(body);
    }
}