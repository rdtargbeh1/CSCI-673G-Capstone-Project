package election.ems_backend.exception;

import election.ems_backend.security.TenantFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.MDC;

@Slf4j
@org.springframework.web.bind.annotation.RestControllerAdvice
public class ApiExceptionHandler {

    /* ---------- IMPORTANT: preserve ResponseStatusException reasons ---------- */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ApiError> handleResponseStatus(ResponseStatusException ex, HttpServletRequest req) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String message = Optional.ofNullable(ex.getReason()).orElse(status.getReasonPhrase());
        // Use error code aligned to status name (optional)
        String code = status.is4xxClientError() ? "REQUEST_REJECTED" : "INTERNAL_ERROR";
        return respond(status, code, message, req, null, ex, false);
    }

    /* ---------- 404 ---------- */
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<ApiError> handleNotFound(NoSuchElementException ex, HttpServletRequest req) {
        return respond(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage(), req, null, ex, false);
    }

    /* ---------- 400 family ---------- */
    @ExceptionHandler({
            IllegalArgumentException.class,
            MissingServletRequestParameterException.class,
            MethodArgumentTypeMismatchException.class,
            HttpMessageNotReadableException.class,
            HttpMediaTypeNotSupportedException.class
    })
    public ResponseEntity<ApiError> handleBadRequest(Exception ex, HttpServletRequest req) {
        return respond(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), req, null, ex, false);
    }

    @ExceptionHandler(TenantFilter.BadTenantSelectionException.class)
    public ResponseEntity<ApiError> handleBadTenant(TenantFilter.BadTenantSelectionException ex, HttpServletRequest req) {
        return respond(HttpStatus.BAD_REQUEST, "BAD_REQUEST", ex.getMessage(), req, null, ex, false);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiError> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest req) {
        Map<String, String> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        fe -> fe.getField(),
                        fe -> Optional.ofNullable(fe.getDefaultMessage()).orElse("Invalid value"),
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Validation failed", req, fieldErrors, ex, false);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiError> handleConstraintViolation(ConstraintViolationException ex, HttpServletRequest req) {
        Map<String, String> fieldErrors = ex.getConstraintViolations().stream()
                .collect(Collectors.toMap(
                        v -> v.getPropertyPath().toString(),
                        v -> Optional.ofNullable(v.getMessage()).orElse("Invalid value"),
                        (a, b) -> a,
                        LinkedHashMap::new
                ));
        return respond(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                "Validation failed", req, fieldErrors, ex, false);
    }

    /* ---------- 405 ---------- */
    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiError> handleMethodNotAllowed(HttpRequestMethodNotSupportedException ex, HttpServletRequest req) {
        return respond(HttpStatus.METHOD_NOT_ALLOWED, "METHOD_NOT_ALLOWED", ex.getMessage(), req, null, ex, false);
    }

    /* ---------- 409 ---------- */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiError> handleConflict(DataIntegrityViolationException ex, HttpServletRequest req) {
        return respond(HttpStatus.CONFLICT, "CONFLICT",
                "Request violates a data constraint", req, null, ex, true);
    }

    /* ---------- 401 / 403 (Spring Security) ---------- */
    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    public ResponseEntity<ApiError> handleSpringAccessDenied(org.springframework.security.access.AccessDeniedException ex, HttpServletRequest req) {
        return respond(HttpStatus.FORBIDDEN, "FORBIDDEN", ex.getMessage(), req, null, ex, false);
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    public ResponseEntity<ApiError> handleSpringAuthentication(org.springframework.security.core.AuthenticationException ex, HttpServletRequest req) {
        return respond(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED",
                Optional.ofNullable(ex.getMessage()).orElse("Authentication failed"),
                req, null, ex, false);
    }

    /* ---------- 500 fallback ---------- */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiError> handleGeneric(Exception ex, HttpServletRequest req) {
        return respond(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                "An unexpected error occurred", req, null, ex, true);
    }

    /* ---------- helper ---------- */
    private ResponseEntity<ApiError> respond(HttpStatus status,
                                             String errorCode,
                                             String message,
                                             HttpServletRequest req,
                                             Map<String, String> fieldErrors,
                                             Exception ex,
                                             boolean logStack) {
        String path = (req != null) ? req.getRequestURI() : null;
        String method = (req != null) ? req.getMethod() : "";
        String rid = Optional.ofNullable(MDC.get("rid")).orElse(""); // ✅ avoid NPE

        if (logStack) log.error("{} {} -> {} {}: {}", safe(method), path, status.value(), errorCode, message, ex);
        else          log.warn ("{} {} -> {} {}: {}", safe(method), path, status.value(), errorCode, message);

        ApiError body = ApiError.builder()
                .timestamp(OffsetDateTime.now())
                .status(status.value())
                .error(errorCode)
                .message(Optional.ofNullable(message).orElse(status.getReasonPhrase()))
                .path(path)
                .rid(rid)
                .fieldErrors(fieldErrors == null || fieldErrors.isEmpty() ? null : fieldErrors)
                .build();

        return ResponseEntity.status(status).body(body);
    }

    private static String safe(String s) { return s == null ? "" : s; }
}
