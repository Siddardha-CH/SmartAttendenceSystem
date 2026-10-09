package com.smartattendance.backend.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Date;

@Entity
@Table(name = "app_users")
public class User {

    @Id
    private String id;
    
    @Column(unique = true)
    private String email;
    
    private String name;
    // WRITE_ONLY: the password can be sent TO the API (create/update user) but is never included
    // in any response. It is stored as a BCrypt hash, never as plain text.
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    private String role; // admin, teacher, viewer
    private String status; // active, disabled
    private Date lastLogin;
    private Date createdAt;

    public User() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Date getLastLogin() { return lastLogin; }
    public void setLastLogin(Date lastLogin) { this.lastLogin = lastLogin; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
