package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.Settings;
import com.smartattendance.backend.repository.SettingsRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    @Autowired
    private SettingsRepository repository;

    @GetMapping
    public Settings getSettings() {
        return repository.findById("default").orElse(null);
    }

    @PutMapping
    public ResponseEntity<Settings> updateSettings(@RequestBody Settings updates) {
        return repository.findById("default").map(existing -> {
            // Update all fields that are present
            if (updates.getRecognitionThreshold() != 0) existing.setRecognitionThreshold(updates.getRecognitionThreshold());
            if (updates.getFaceMatchTolerance() != 0) existing.setFaceMatchTolerance(updates.getFaceMatchTolerance());
            if (updates.getRequiredFaceSamples() != 0) existing.setRequiredFaceSamples(updates.getRequiredFaceSamples());
            existing.setEnableFaceQualityCheck(updates.isEnableFaceQualityCheck());
            if (updates.getSelectedCamera() != null) existing.setSelectedCamera(updates.getSelectedCamera());
            if (updates.getCameraResolution() != null) existing.setCameraResolution(updates.getCameraResolution());
            existing.setMirrorCamera(updates.isMirrorCamera());
            if (updates.getLateThreshold() != null) existing.setLateThreshold(updates.getLateThreshold());
            if (updates.getScanInterval() != 0) existing.setScanInterval(updates.getScanInterval());
            existing.setDuplicateProtection(updates.isDuplicateProtection());
            existing.setAllowManualOverride(updates.isAllowManualOverride());
            if (updates.getTheme() != null) existing.setTheme(updates.getTheme());
            existing.setCompactLayout(updates.isCompactLayout());
            existing.setEnableAnimations(updates.isEnableAnimations());
            if (updates.getAcademicYear() != null) existing.setAcademicYear(updates.getAcademicYear());

            return ResponseEntity.ok(repository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }
}
