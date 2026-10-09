package com.smartattendance.backend.repository;

import com.smartattendance.backend.model.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, String> {
    Optional<Student> findByStudentId(String studentId);

    /** One row per student: [id, number of face images]. Lets the list endpoint skip loading the images. */
    @Query("SELECT s.id, SIZE(s.faceImages) FROM Student s")
    List<Object[]> countFaceImagesPerStudent();
}
