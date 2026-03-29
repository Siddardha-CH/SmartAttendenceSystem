package com.smartattendance.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "settings")
public class Settings {

    @Id
    private String id; // usually 'default'

    private float recognitionThreshold;
    private float faceMatchTolerance;
    private int requiredFaceSamples;
    private boolean enableFaceQualityCheck;
    
    private String selectedCamera;
    private String cameraResolution;
    private boolean mirrorCamera;
    
    private String lateThreshold;
    private int scanInterval;
    private boolean duplicateProtection;
    private boolean allowManualOverride;
    
    private String theme;
    private boolean compactLayout;
    private boolean enableAnimations;
    
    private String academicYear;

    public Settings() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public float getRecognitionThreshold() { return recognitionThreshold; }
    public void setRecognitionThreshold(float recognitionThreshold) { this.recognitionThreshold = recognitionThreshold; }
    public float getFaceMatchTolerance() { return faceMatchTolerance; }
    public void setFaceMatchTolerance(float faceMatchTolerance) { this.faceMatchTolerance = faceMatchTolerance; }
    public int getRequiredFaceSamples() { return requiredFaceSamples; }
    public void setRequiredFaceSamples(int requiredFaceSamples) { this.requiredFaceSamples = requiredFaceSamples; }
    public boolean isEnableFaceQualityCheck() { return enableFaceQualityCheck; }
    public void setEnableFaceQualityCheck(boolean enableFaceQualityCheck) { this.enableFaceQualityCheck = enableFaceQualityCheck; }
    public String getSelectedCamera() { return selectedCamera; }
    public void setSelectedCamera(String selectedCamera) { this.selectedCamera = selectedCamera; }
    public String getCameraResolution() { return cameraResolution; }
    public void setCameraResolution(String cameraResolution) { this.cameraResolution = cameraResolution; }
    public boolean isMirrorCamera() { return mirrorCamera; }
    public void setMirrorCamera(boolean mirrorCamera) { this.mirrorCamera = mirrorCamera; }
    public String getLateThreshold() { return lateThreshold; }
    public void setLateThreshold(String lateThreshold) { this.lateThreshold = lateThreshold; }
    public int getScanInterval() { return scanInterval; }
    public void setScanInterval(int scanInterval) { this.scanInterval = scanInterval; }
    public boolean isDuplicateProtection() { return duplicateProtection; }
    public void setDuplicateProtection(boolean duplicateProtection) { this.duplicateProtection = duplicateProtection; }
    public boolean isAllowManualOverride() { return allowManualOverride; }
    public void setAllowManualOverride(boolean allowManualOverride) { this.allowManualOverride = allowManualOverride; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public boolean isCompactLayout() { return compactLayout; }
    public void setCompactLayout(boolean compactLayout) { this.compactLayout = compactLayout; }
    public boolean isEnableAnimations() { return enableAnimations; }
    public void setEnableAnimations(boolean enableAnimations) { this.enableAnimations = enableAnimations; }
    public String getAcademicYear() { return academicYear; }
    public void setAcademicYear(String academicYear) { this.academicYear = academicYear; }
}
