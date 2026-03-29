package com.smartattendance.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_preferences")
public class UserPreferences {

    @Id
    private String id;
    
    @Column(unique = true)
    private String userId;
    
    private String theme;
    private boolean compactLayout;
    private boolean enableAnimations;

    public UserPreferences() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public boolean isCompactLayout() { return compactLayout; }
    public void setCompactLayout(boolean compactLayout) { this.compactLayout = compactLayout; }
    public boolean isEnableAnimations() { return enableAnimations; }
    public void setEnableAnimations(boolean enableAnimations) { this.enableAnimations = enableAnimations; }
}
