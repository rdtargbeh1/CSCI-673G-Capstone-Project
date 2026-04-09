package election.ems_backend.utility;

import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.PBEKeySpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Base64;

@Slf4j
@Service
public class CryptoService {

    // Properties (allow empty to avoid startup failure)
    private final String passwordProp;
    private final String saltProp;

    // Derived key
    private SecretKeySpec key;

    // Constants
    private static final int PBKDF2_ITER = 120_000;
    private static final int KEY_BITS = 256;     // AES-256
    private static final int IV_BYTES = 12;      // GCM standard 96-bit IV
    private static final int TAG_BITS = 128;     // GCM tag length
    private static final SecureRandom RNG = new SecureRandom();

    // Dev fallbacks (ONLY for local/dev; override in prod!)
    private static final String DEV_FALLBACK_PASSWORD = "dev-change-me-password";
    private static final String DEV_FALLBACK_SALT     = "dev-change-me-salt";

    public CryptoService(
            @Value("${mfa.crypto.password:}") String passwordProp,
            @Value("${mfa.crypto.salt:}") String saltProp
    ) {
        this.passwordProp = passwordProp;
        this.saltProp = saltProp;
    }

    @PostConstruct
    void init() {
        String pwd = passwordProp;
        String salt = saltProp;

        if (pwd == null || pwd.isBlank() || salt == null || salt.isBlank()) {
            log.warn("MFA crypto secrets not configured. Using DEV fallbacks. " +
                    "Set 'mfa.crypto.password' and 'mfa.crypto.salt' for production!");
            pwd = DEV_FALLBACK_PASSWORD;
            salt = DEV_FALLBACK_SALT;
        }

        try {
            PBEKeySpec spec = new PBEKeySpec(
                    pwd.toCharArray(),
                    salt.getBytes(StandardCharsets.UTF_8),
                    PBKDF2_ITER,
                    KEY_BITS
            );
            SecretKeyFactory skf = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
            byte[] derived = skf.generateSecret(spec).getEncoded();
            this.key = new SecretKeySpec(derived, "AES");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to derive MFA crypto key", e);
        }

        log.info("CryptoService initialized (AES-GCM, PBKDF2 iterations: {})", PBKDF2_ITER);
    }

    /** Encrypts plaintext → base64( IV(12) || CIPHERTEXT || TAG ) */
    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_BYTES];
            RNG.nextBytes(iv);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] ct = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            ByteBuffer out = ByteBuffer.allocate(iv.length + ct.length);
            out.put(iv).put(ct);
            return Base64.getEncoder().encodeToString(out.array());
        } catch (Exception e) {
            throw new IllegalStateException("Encrypt failed", e);
        }
    }

    /** Decrypts base64( IV || CIPHERTEXT || TAG ) → plaintext */
    public String decrypt(String b64) {
        try {
            byte[] all = Base64.getDecoder().decode(b64);
            if (all.length < IV_BYTES + 16) { // minimal sanity
                throw new IllegalArgumentException("Ciphertext too short");
            }
            byte[] iv = new byte[IV_BYTES];
            byte[] ct = new byte[all.length - IV_BYTES];
            System.arraycopy(all, 0, iv, 0, IV_BYTES);
            System.arraycopy(all, IV_BYTES, ct, 0, ct.length);

            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_BITS, iv));
            byte[] pt = cipher.doFinal(ct);
            return new String(pt, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new IllegalStateException("Decrypt failed", e);
        }
    }
}
