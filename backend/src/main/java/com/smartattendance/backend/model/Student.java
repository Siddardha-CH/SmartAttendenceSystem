package com.smartattendance.backend.model;

import jakarta.persistence.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "students")
public class Student {

    @Id
    private String id;
    
    private String name;
    
    @Column(unique = true)
    private String studentId;
    
    @Column(name = "class_name") // 'class' is a reserved keyword in some DBs
    private String className;
    
    private String section;
    private String email;
    private String phone;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "student_face_descriptors", joinColumns = @JoinColumn(name = "student_id"))
    @Column(name = "descriptor_value")
    private List<Float> faceDescriptor;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "student_face_images", joinColumns = @JoinColumn(name = "student_id"))
    @Column(name = "image_data", columnDefinition = "TEXT") // H2 TEXT maps to CLOB for large strings
    @Lob // Large Object
    private List<String> faceImages;

    private Date createdAt;

    // Default constructor
    public Student() {}

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public List<Float> getFaceDescriptor() { return faceDescriptor; }
    public void setFaceDescriptor(List<Float> faceDescriptor) { this.faceDescriptor = faceDescriptor; }
    public List<String> getFaceImages() { return faceImages; }
    public void setFaceImages(List<String> faceImages) { this.faceImages = faceImages; }
    public Date getCreatedAt() { return createdAt; }
    public void setCreatedAt(Date createdAt) { this.createdAt = createdAt; }
}
