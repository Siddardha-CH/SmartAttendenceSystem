package com.smartattendance.backend.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.util.Date;

@Entity
@Table(name = "classes")
public class ClassEntity {
    @Id
    private String id;
    private String name;
    private String instituteId;
    private Date createdAt;

    public ClassEntity() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getInstituteId() { return instituteId; }
    public void setInstituteId(String instituteId) { this.instituteId = instituteId; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
