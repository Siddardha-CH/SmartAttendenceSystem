package com.smartattendance.backend.model;

import jakarta.persistence.*;

@Entity
// Index on (date, student) because "has this student been marked today?" is asked on every scan.
@Table(name = "attendance_records", indexes = @Index(name = "idx_attendance_date_student", columnList = "attendance_date, student_id"))
public class AttendanceRecord {

    @Id
    private String id;

    @Column(name = "student_id") // the student's roll number (Student.studentId), not the internal UUID
    private String studentId;
    private String studentName;

    @Column(name = "attendance_date")
    private String date;

    @Column(name = "attendance_time")
    private String time;

    @Column(name = "attendance_status")
    private String status; // present, late, absent

    private float confidence;
    private String markedBy; // face-recognition, manual

    public AttendanceRecord() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public float getConfidence() { return confidence; }
    public void setConfidence(float confidence) { this.confidence = confidence; }
    public String getMarkedBy() { return markedBy; }
    public void setMarkedBy(String markedBy) { this.markedBy = markedBy; }
}
