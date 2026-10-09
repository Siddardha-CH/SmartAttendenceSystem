package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.Settings;
import com.smartattendance.backend.repository.SettingsRepository;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsRepository repository;

    public SettingsController(SettingsRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public Settings getSettings() {
        return load();
    }

    /** Partial update: only the fields present in the request body are changed. Admin only. */
    @PutMapping
    public Settings updateSettings(@RequestBody Settings updates) {
        Settings existing = load();
        existing.applyUpdates(updates);
        return repository.save(existing);
    }

    private Settings load() {
        // The row is created at startup, but recreate it if someone deleted it by hand.
        return repository.findById(Settings.DEFAULT_ID).orElseGet(() -> repository.save(Settings.defaults()));
    }
}
