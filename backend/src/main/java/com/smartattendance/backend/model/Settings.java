package com.smartattendance.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * System-wide settings. There is exactly one row, with id "default".
 *
 * Fields use wrapper types (Float, Integer, Boolean) instead of primitives (float, int, boolean)
 * so that a partial update like {"recognitionThreshold": 0.5} arrives with every other field as
 * null - meaning "not sent, leave it alone" - instead of 0 / false, which would overwrite them.
 */
@Entity
@Table(name = "settings")
public class Settings {

    public static final String DEFAULT_ID = "default";

    @Id
    private String id;

    // Face recognition
    private Float recognitionThreshold;   // max face-descriptor distance that counts as a match (lower = stricter)
    private Float faceMatchTolerance;     // min detector confidence for a face to be considered at all
    private Integer requiredFaceSamples;  // photos captured when registering a face
    private Boolean enableFaceQualityCheck;

    // Camera
    private String selectedCamera;        // browser deviceId, "" = default camera
    private String cameraResolution;      // low | medium | high
    private Boolean mirrorCamera;

    // Attendance rules
    private String lateThreshold;         // "HH:mm" - arrivals after this are "late"
    private Integer scanInterval;         // ms between recognition scans
    private Boolean duplicateProtection;  // only one record per student per day
    private Boolean allowManualOverride;  // allow marking attendance by hand

    // Appearance (per-user preferences live in UserPreferences; these are the system defaults)
    private String theme;
    private Boolean compactLayout;
    private Boolean enableAnimations;

    private String academicYear;

    public Settings() {}

    public static Settings defaults() {
        Settings s = new Settings();
        s.setId(DEFAULT_ID);
        s.setRecognitionThreshold(0.6f);
        s.setFaceMatchTolerance(0.5f);
        s.setRequiredFaceSamples(5);
        s.setEnableFaceQualityCheck(true);
        s.setSelectedCamera("");
        s.setCameraResolution("medium");
        s.setMirrorCamera(false);
        s.setLateThreshold("09:00");
        s.setScanInterval(3000);
        s.setDuplicateProtection(true);
        s.setAllowManualOverride(true);
        s.setTheme("light");
        s.setCompactLayout(false);
        s.setEnableAnimations(true);
        s.setAcademicYear("2025-2026");
        return s;
    }

    /** Copies every non-null field of {@code updates} onto this object. */
    public void applyUpdates(Settings updates) {
        if (updates.recognitionThreshold != null) recognitionThreshold = updates.recognitionThreshold;
        if (updates.faceMatchTolerance != null) faceMatchTolerance = updates.faceMatchTolerance;
        if (updates.requiredFaceSamples != null) requiredFaceSamples = updates.requiredFaceSamples;
        if (updates.enableFaceQualityCheck != null) enableFaceQualityCheck = updates.enableFaceQualityCheck;
        if (updates.selectedCamera != null) selectedCamera = updates.selectedCamera;
        if (updates.cameraResolution != null) cameraResolution = updates.cameraResolution;
        if (updates.mirrorCamera != null) mirrorCamera = updates.mirrorCamera;
        if (updates.lateThreshold != null) lateThreshold = updates.lateThreshold;
        if (updates.scanInterval != null) scanInterval = updates.scanInterval;
        if (updates.duplicateProtection != null) duplicateProtection = updates.duplicateProtection;
        if (updates.allowManualOverride != null) allowManualOverride = updates.allowManualOverride;
        if (updates.theme != null) theme = updates.theme;
        if (updates.compactLayout != null) compactLayout = updates.compactLayout;
        if (updates.enableAnimations != null) enableAnimations = updates.enableAnimations;
        if (updates.academicYear != null) academicYear = updates.academicYear;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Float getRecognitionThreshold() { return recognitionThreshold; }
    public void setRecognitionThreshold(Float recognitionThreshold) { this.recognitionThreshold = recognitionThreshold; }
    public Float getFaceMatchTolerance() { return faceMatchTolerance; }
    public void setFaceMatchTolerance(Float faceMatchTolerance) { this.faceMatchTolerance = faceMatchTolerance; }
    public Integer getRequiredFaceSamples() { return requiredFaceSamples; }
    public void setRequiredFaceSamples(Integer requiredFaceSamples) { this.requiredFaceSamples = requiredFaceSamples; }
    public Boolean getEnableFaceQualityCheck() { return enableFaceQualityCheck; }
    public void setEnableFaceQualityCheck(Boolean enableFaceQualityCheck) { this.enableFaceQualityCheck = enableFaceQualityCheck; }
    public String getSelectedCamera() { return selectedCamera; }
    public void setSelectedCamera(String selectedCamera) { this.selectedCamera = selectedCamera; }
    public String getCameraResolution() { return cameraResolution; }
    public void setCameraResolution(String cameraResolution) { this.cameraResolution = cameraResolution; }
    public Boolean getMirrorCamera() { return mirrorCamera; }
    public void setMirrorCamera(Boolean mirrorCamera) { this.mirrorCamera = mirrorCamera; }
    public String getLateThreshold() { return lateThreshold; }
    public void setLateThreshold(String lateThreshold) { this.lateThreshold = lateThreshold; }
    public Integer getScanInterval() { return scanInterval; }
    public void setScanInterval(Integer scanInterval) { this.scanInterval = scanInterval; }
    public Boolean getDuplicateProtection() { return duplicateProtection; }
    public void setDuplicateProtection(Boolean duplicateProtection) { this.duplicateProtection = duplicateProtection; }
    public Boolean getAllowManualOverride() { return allowManualOverride; }
    public void setAllowManualOverride(Boolean allowManualOverride) { this.allowManualOverride = allowManualOverride; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Boolean getCompactLayout() { return compactLayout; }
    public void setCompactLayout(Boolean compactLayout) { this.compactLayout = compactLayout; }
    public Boolean getEnableAnimations() { return enableAnimations; }
    public void setEnableAnimations(Boolean enableAnimations) { this.enableAnimations = enableAnimations; }
    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
}
