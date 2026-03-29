package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.UserPreferences;
import com.smartattendance.backend.repository.UserPreferencesRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/preferences")
public class UserPreferencesController {

    @Autowired
    private UserPreferencesRepository repository;

    @GetMapping("/{userId}")
    public ResponseEntity<UserPreferences> getPreferences(@PathVariable("userId") String userId) {
        return repository.findByUserId(userId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{userId}")
    public UserPreferences savePreferences(@PathVariable("userId") String userId, @RequestBody UserPreferences updates) {
        return repository.findByUserId(userId).map(existing -> {
            if (updates.getTheme() != null) existing.setTheme(updates.getTheme());
            existing.setCompactLayout(updates.isCompactLayout());
            existing.setEnableAnimations(updates.isEnableAnimations());
            return repository.save(existing);
        }).orElseGet(() -> {
            updates.setId(UUID.randomUUID().toString());
            updates.setUserId(userId);
            return repository.save(updates);
        });
    }
}
