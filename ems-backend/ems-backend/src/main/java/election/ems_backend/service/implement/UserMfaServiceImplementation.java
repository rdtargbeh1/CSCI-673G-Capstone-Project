package election.ems_backend.service.implement;

import com.eatthepath.otp.TimeBasedOneTimePasswordGenerator;
import election.ems_backend.dto.MfaProvisionResponse;
import election.ems_backend.entity.SystemUser;
import election.ems_backend.entity.UserMfa;
import election.ems_backend.enums.MfaMethod;
import election.ems_backend.repository.SystemUserRepository;
import election.ems_backend.repository.UserMfaRepository;
import election.ems_backend.service.UserMfaService;
import election.ems_backend.utility.CryptoService;
import election.ems_backend.utility.MfaStatusResponse;
import org.apache.commons.codec.binary.Base32;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@Transactional
public class UserMfaServiceImplementation implements UserMfaService {

    private final UserMfaRepository mfaRepo;
    private final SystemUserRepository userRepo;
    private final CryptoService crypto;

    public UserMfaServiceImplementation(UserMfaRepository mfaRepo,
                                        SystemUserRepository userRepo,
                                        CryptoService crypto) {
        this.mfaRepo = mfaRepo;
        this.userRepo = userRepo;
        this.crypto = crypto;
    }

    @Override
    public MfaProvisionResponse provisionTotp(UUID userId, String issuer) {
        SystemUser user = userRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        // Generate a random 160-bit secret (compatible with Google Authenticator)
        SecretKey key = generateTotpKey();
        String base32Secret = new Base32().encodeToString(key.getEncoded()).replace("=", "");

        // Encrypt & persist (create or update row)
        UserMfa mfa = mfaRepo.findById(userId).orElseGet(UserMfa::new);
        mfa.setUserId(userId);
        mfa.setUser(user);
        mfa.setMethod(null); // not enabled yet
        mfa.setSecretEncrypted(crypto.encrypt(base32Secret));
        mfaRepo.save(mfa);

        // Build otpauth:// URL (shown once to the user to set up app)
        String accountLabel = user.getEmail() != null ? user.getEmail() : user.getUserName();
        String label = url(issuer) + ":" + url(accountLabel);
        String otpauthUrl = "otpauth://totp/" + label
                + "?secret=" + base32Secret
                + "&issuer=" + url(issuer)
                + "&algorithm=SHA1&digits=6&period=30";

        return MfaProvisionResponse.builder()
                .method(MfaMethod.TOTP)
                .otpauthUrl(otpauthUrl)
                .base32SecretOnce(base32Secret)
                .issuer(issuer)
                .accountLabel(accountLabel)
                .build();
    }

    @Override
    public void verifyAndEnableTotp(UUID userId, String code) {
        UserMfa mfa = mfaRepo.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Provisioning not started"));

        String base32Secret = crypto.decrypt(mfa.getSecretEncrypted());
        if (!isValidTotp(base32Secret, code)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid TOTP code");
        }

        mfa.setMethod(MfaMethod.TOTP);
        mfaRepo.save(mfa);
    }

    @Override
    public void disable(UUID userId) {
        Optional<UserMfa> opt = mfaRepo.findById(userId);
        if (opt.isEmpty()) return;
        UserMfa mfa = opt.get();
        mfa.setMethod(null);
        mfa.setSecretEncrypted(null);
        mfaRepo.save(mfa);
    }

    @Override
    public MfaStatusResponse status(UUID userId) {
        return mfaRepo.findById(userId)
                .map(m -> MfaStatusResponse.builder()
                        .enabled(m.getMethod() != null)
                        .method(m.getMethod())
                        .build())
                .orElse(MfaStatusResponse.builder()
                        .enabled(false)
                        .method(null)
                        .build());
    }

    // ---------- helpers ----------

    private static SecretKey generateTotpKey() {
        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(TimeBasedOneTimePasswordGenerator.TOTP_ALGORITHM_HMAC_SHA1);
            keyGenerator.init(160); // 160-bit key for SHA1 (compatible with GA)
            return keyGenerator.generateKey();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("TOTP key generation failed", e);
        }
    }

    private static boolean isValidTotp(String base32Secret, String code) {
        try {
            byte[] keyBytes = new Base32().decode(base32Secret);
            TimeBasedOneTimePasswordGenerator totp = new TimeBasedOneTimePasswordGenerator(Duration.ofSeconds(30));
            Key key = new javax.crypto.spec.SecretKeySpec(keyBytes, "RAW");

            Instant now = Instant.now();
            // Allow small window: current ± 1 step to be robust
            int current = totp.generateOneTimePassword(key, now);
            int prev = totp.generateOneTimePassword(key, now.minus(totp.getTimeStep()));
            int next = totp.generateOneTimePassword(key, now.plus(totp.getTimeStep()));

            return codeEquals(code, current) || codeEquals(code, prev) || codeEquals(code, next);
        } catch (Exception e) {
            return false;
        }
    }

    private static boolean codeEquals(String input, int expected) {
        String exp = String.format("%06d", expected);
        return exp.equals(input);
    }

    private static String url(String s) {
        return URLEncoder.encode(s == null ? "" : s, StandardCharsets.UTF_8);
    }
}