package com.smartattendance.backend.model;

import jakarta.persistence.*;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "students")
public class Student {

    @Id
    private String id;                 // internal UUID

    private String name;

    @Column(unique = true)
    private String studentId;          // the school's own roll number, e.g. "STU001"

    @Column(name = "class_name")       // 'class' is a reserved word in Java and SQL
    private String className;

    private String section;
    private String email;
    private String phone;

    /** 128 numbers produced by the face-recognition model, averaged over the registration samples. */
    @Convert(converter = FloatListConverter.class)
    @Column(name = "face_descriptor", columnDefinition = "TEXT")
    private List<Float> faceDescriptor;

    /** Small base64 JPEG thumbnails captured during registration (for display only). */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "student_face_images", joinColumns = @JoinColumn(name = "student_id"))
    @Column(name = "image_data", columnDefinition = "TEXT")
    private List<String> faceImages;

    private Date createdAt;

    /** Not stored. Filled in for list responses, which leave out the (large) images themselves. */
    @Transient
    private Integer faceImageCount;

    public Student() {}

    /** A copy without the face images - used for the student list so it stays small and fast. */
    public Student withoutImages(int imageCount) {
        Student s = new Student();
        s.id = id;
        s.name = name;
        s.studentId = studentId;
        s.className = className;
        s.section = section;
        s.email = email;
        s.phone = phone;
        s.faceDescriptor = faceDescriptor;
        s.createdAt = createdAt;
        s.faceImageCount = imageCount;
        return s;
    }

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
    public Integer getFaceImageCount() { return faceImageCount != null ? faceImageCount : (faceImages != null ? faceImages.size() : 0); }
}
