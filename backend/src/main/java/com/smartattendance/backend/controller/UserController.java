package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.User;
import com.smartattendance.backend.repository.UserRepository;
import com.smartattendance.backend.security.AuthUser;
import com.smartattendance.backend.security.TokenService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private static final Set<String> ROLES = Set.of(AuthUser.ADMIN, AuthUser.TEACHER, AuthUser.VIEWER);
    private static final Set<String> STATUSES = Set.of("active", "disabled");

    private final UserRepository repository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public UserController(UserRepository repository, PasswordEncoder passwordEncoder, TokenService tokenService) {
        this.repository = repository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    /** Public. Returns {"token": "...", "user": {...}} on success, 401 otherwise. */
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> credentials) {
        String email = normalizeEmail(credentials.get("email"));
        String password = credentials.get("password");
        if (email == null || password == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        return repository.findByEmailIgnoreCase(email)
                .filter(user -> "active".equals(user.getStatus()))
                .filter(user -> passwordMatches(user, password))
                .map(user -> {
                    user.setLastLogin(new Date());
                    repository.save(user);
                    return ResponseEntity.ok(Map.<String, Object>of("token", tokenService.issue(user), "user", user));
                })
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    /** Returns whoever owns the token. The frontend calls this on page load to check the saved session is still valid. */
    @GetMapping("/me")
    public ResponseEntity<User> me(@RequestAttribute(AuthUser.REQUEST_ATTRIBUTE) AuthUser auth) {
        return repository.findById(auth.id())
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.status(HttpStatus.UNAUTHORIZED).build());
    }

    @GetMapping
    public List<User> getAllUsers() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable("id") String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Object> addUser(@RequestBody User user) {
        user.setEmail(normalizeEmail(user.getEmail()));
        if (user.getEmail() == null || user.getName() == null || user.getName().isBlank()) {
            return badRequest("Name and email are required");
        }
        if (user.getPassword() == null || user.getPassword().length() < 6) {
            return badRequest("Password must be at least 6 characters");
        }
        if (user.getRole() == null) user.setRole(AuthUser.TEACHER);
        if (user.getStatus() == null) user.setStatus("active");
        if (!ROLES.contains(user.getRole()) || !STATUSES.contains(user.getStatus())) {
            return badRequest("Invalid role or status");
        }
        if (repository.findByEmailIgnoreCase(user.getEmail()).isPresent()) {
            return badRequest("A user with this email already exists");
        }

        user.setId(UUID.randomUUID().toString());
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setLastLogin(null);
        user.setCreatedAt(new Date());
        return ResponseEntity.ok(repository.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> updateUser(@PathVariable("id") String id,
                                             @RequestBody User updates,
                                             @RequestAttribute(AuthUser.REQUEST_ATTRIBUTE) AuthUser auth) {
        User existing = repository.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();

        String newEmail = normalizeEmail(updates.getEmail());
        if (newEmail != null && !newEmail.equalsIgnoreCase(existing.getEmail())) {
            if (repository.findByEmailIgnoreCase(newEmail).isPresent()) {
                return badRequest("A user with this email already exists");
            }
            existing.setEmail(newEmail);
        }
        if (updates.getRole() != null && !ROLES.contains(updates.getRole())) return badRequest("Invalid role");
        if (updates.getStatus() != null && !STATUSES.contains(updates.getStatus())) return badRequest("Invalid status");

        boolean losesAdmin = AuthUser.ADMIN.equals(existing.getRole())
                && ((updates.getRole() != null && !AuthUser.ADMIN.equals(updates.getRole()))
                    || "disabled".equals(updates.getStatus()));
        if (losesAdmin && id.equals(auth.id())) {
            return badRequest("You cannot remove your own admin access");
        }
        if (losesAdmin && countActiveAdmins() <= 1) {
            return badRequest("There must be at least one active admin");
        }

        if (updates.getName() != null && !updates.getName().isBlank()) existing.setName(updates.getName());
        if (updates.getPassword() != null && !updates.getPassword().isEmpty()) {
            if (updates.getPassword().length() < 6) return badRequest("Password must be at least 6 characters");
            existing.setPassword(passwordEncoder.encode(updates.getPassword()));
        }
        if (updates.getRole() != null) existing.setRole(updates.getRole());
        if (updates.getStatus() != null) existing.setStatus(updates.getStatus());

        return ResponseEntity.ok(repository.save(existing));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deleteUser(@PathVariable("id") String id,
                                             @RequestAttribute(AuthUser.REQUEST_ATTRIBUTE) AuthUser auth) {
        if (id.equals(auth.id())) {
            return badRequest("You cannot delete your own account");
        }
        User existing = repository.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();
        if (AuthUser.ADMIN.equals(existing.getRole()) && countActiveAdmins() <= 1) {
            return badRequest("There must be at least one active admin");
        }
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    private boolean passwordMatches(User user, String rawPassword) {
        // Stored passwords are BCrypt hashes (DatabaseInitConfig upgrades any old plain-text ones at startup).
        return user.getPassword() != null && passwordEncoder.matches(rawPassword, user.getPassword());
    }

    private long countActiveAdmins() {
        return repository.findAll().stream()
                .filter(u -> AuthUser.ADMIN.equals(u.getRole()) && "active".equals(u.getStatus()))
                .count();
    }

    private static String normalizeEmail(String email) {
        return email == null || email.isBlank() ? null : email.trim().toLowerCase();
    }

    private static ResponseEntity<Object> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }
}
