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
    // Boolean (not boolean) so a partial update can leave a field out - see Settings for why.
    private Boolean compactLayout;
    private Boolean enableAnimations;

    public UserPreferences() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getTheme() { return theme; }
    public void setTheme(String theme) { this.theme = theme; }
    public Boolean getCompactLayout() { return compactLayout; }
    public void setCompactLayout(Boolean compactLayout) { this.compactLayout = compactLayout; }
    public Boolean getEnableAnimations() { return enableAnimations; }
    public void setEnableAnimations(Boolean enableAnimations) { this.enableAnimations = enableAnimations; }
}
