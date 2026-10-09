package com.smartattendance.backend.security;

import com.smartattendance.backend.model.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;

/**
 * Issues and verifies signed session tokens.
 *
 * Token format:  base64url(userId|role|expiryEpochSeconds) + "." + base64url(HMAC-SHA256 signature)
 *
 * This is the same idea as a JWT, without the extra library. The server signs the payload with a
 * secret only it knows, so a client cannot forge or edit a token (e.g. change "teacher" to "admin")
 * without the signature check failing.
 */
@Service
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final byte[] secret;
    private final Duration validity;

    public TokenService(@Value("${app.auth.token-secret:}") String configuredSecret,
                        @Value("${app.auth.token-validity-hours:12}") long validityHours) {
        if (configuredSecret == null || configuredSecret.isBlank()) {
            // No secret configured: generate a random one. Tokens then stop working after a restart,
            // which is acceptable for local development but not for production.
            byte[] random = new byte[32];
            new SecureRandom().nextBytes(random);
            this.secret = random;
            log.warn("APP_TOKEN_SECRET is not set - using a random secret. Users will be logged out on every restart.");
        } else {
            this.secret = configuredSecret.getBytes(StandardCharsets.UTF_8);
        }
        this.validity = Duration.ofHours(validityHours);
    }

    public String issue(User user) {
        long expiresAt = Instant.now().plus(validity).getEpochSecond();
        String payload = user.getId() + "|" + user.getRole() + "|" + expiresAt;
        String encodedPayload = ENCODER.encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return encodedPayload + "." + ENCODER.encodeToString(sign(encodedPayload));
    }

    /** Returns the authenticated user described by the token, or empty if it is malformed, forged or expired. */
    public Optional<AuthUser> verify(String token) {
        if (token == null) return Optional.empty();
        int dot = token.indexOf('.');
        if (dot <= 0 || dot == token.length() - 1) return Optional.empty();

        String encodedPayload = token.substring(0, dot);
        try {
            byte[] givenSignature = DECODER.decode(token.substring(dot + 1));
            // Constant-time comparison so attackers can't learn the signature byte by byte from timing.
            if (!MessageDigest.isEqual(sign(encodedPayload), givenSignature)) return Optional.empty();

            String[] parts = new String(DECODER.decode(encodedPayload), StandardCharsets.UTF_8).split("\\|");
            if (parts.length != 3) return Optional.empty();
            if (Instant.now().getEpochSecond() > Long.parseLong(parts[2])) return Optional.empty();
            return Optional.of(new AuthUser(parts[0], parts[1]));
        } catch (IllegalArgumentException e) {
            // Bad base64 or bad number
            return Optional.empty();
        }
    }

    private byte[] sign(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException("Could not sign token", e);
        }
    }
}
