package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.UserPreferences;
import com.smartattendance.backend.repository.UserPreferencesRepository;
import com.smartattendance.backend.security.AuthUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

/** Per-user UI preferences (theme etc.). Users can only see and change their own. */
@RestController
@RequestMapping("/api/preferences")
public class UserPreferencesController {

    private final UserPreferencesRepository repository;

    public UserPreferencesController(UserPreferencesRepository repository) {
        this.repository = repository;
    }

    @GetMapping("/{userId}")
    public ResponseEntity<UserPreferences> getPreferences(@PathVariable("userId") String userId,
                                                          @RequestAttribute(AuthUser.REQUEST_ATTRIBUTE) AuthUser auth) {
        requireSelfOrAdmin(userId, auth);
        return repository.findByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{userId}")
    public UserPreferences savePreferences(@PathVariable("userId") String userId,
                                           @RequestBody UserPreferences updates,
                                           @RequestAttribute(AuthUser.REQUEST_ATTRIBUTE) AuthUser auth) {
        requireSelfOrAdmin(userId, auth);
        UserPreferences prefs = repository.findByUserId(userId).orElseGet(() -> {
            UserPreferences created = new UserPreferences();
            created.setId(UUID.randomUUID().toString());
            created.setUserId(userId);
            created.setTheme("system");
            created.setCompactLayout(false);
            created.setEnableAnimations(true);
            return created;
        });
        if (updates.getTheme() != null) prefs.setTheme(updates.getTheme());
        if (updates.getCompactLayout() != null) prefs.setCompactLayout(updates.getCompactLayout());
        if (updates.getEnableAnimations() != null) prefs.setEnableAnimations(updates.getEnableAnimations());
        return repository.save(prefs);
    }

    private static void requireSelfOrAdmin(String userId, AuthUser auth) {
        if (!userId.equals(auth.id()) && !auth.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only access your own preferences");
        }
    }
}
