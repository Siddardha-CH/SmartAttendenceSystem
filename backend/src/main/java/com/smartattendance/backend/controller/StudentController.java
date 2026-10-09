package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.Student;
import com.smartattendance.backend.repository.StudentRepository;
import org.hibernate.Hibernate;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    /** Size of a face-api.js face descriptor. */
    private static final int DESCRIPTOR_LENGTH = 128;

    private final StudentRepository repository;

    public StudentController(StudentRepository repository) {
        this.repository = repository;
    }

    /** All students, WITHOUT their face images (each response would otherwise carry every thumbnail). */
    @GetMapping
    @Transactional(readOnly = true)
    public List<Student> getAllStudents() {
        Map<String, Integer> imageCounts = new HashMap<>();
        for (Object[] row : repository.countFaceImagesPerStudent()) {
            imageCounts.put((String) row[0], ((Number) row[1]).intValue());
        }
        return repository.findAll().stream()
                .map(s -> s.withoutImages(imageCounts.getOrDefault(s.getId(), 0)))
                .toList();
    }

    /** One student, including face images. */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<Student> getStudent(@PathVariable("id") String id) {
        return repository.findById(id)
                .map(s -> {
                    Hibernate.initialize(s.getFaceImages()); // load the lazy list before the transaction ends
                    return ResponseEntity.ok(s);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Object> addStudent(@RequestBody Student student) {
        if (isBlank(student.getName()) || isBlank(student.getStudentId())) {
            return badRequest("Name and Student ID are required");
        }
        student.setStudentId(student.getStudentId().trim());
        if (repository.findByStudentId(student.getStudentId()).isPresent()) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "A student with ID " + student.getStudentId() + " already exists"));
        }
        if (!isValidDescriptor(student.getFaceDescriptor())) {
            return badRequest("faceDescriptor must contain exactly " + DESCRIPTOR_LENGTH + " numbers");
        }
        student.setId(UUID.randomUUID().toString());
        student.setCreatedAt(new Date());
        return ResponseEntity.ok(repository.save(student));
    }

    /** Partial update: only fields present in the body change. Also used to save face registration. */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<Object> updateStudent(@PathVariable("id") String id, @RequestBody Student updates) {
        Student existing = repository.findById(id).orElse(null);
        if (existing == null) return ResponseEntity.notFound().build();

        if (updates.getStudentId() != null && !updates.getStudentId().trim().equals(existing.getStudentId())) {
            String newStudentId = updates.getStudentId().trim();
            if (newStudentId.isEmpty() || repository.findByStudentId(newStudentId).isPresent()) {
                return ResponseEntity.status(HttpStatus.CONFLICT)
                        .body(Map.of("error", "Student ID is empty or already in use"));
            }
            existing.setStudentId(newStudentId);
        }
        if (!isValidDescriptor(updates.getFaceDescriptor())) {
            return badRequest("faceDescriptor must contain exactly " + DESCRIPTOR_LENGTH + " numbers");
        }

        if (updates.getName() != null) existing.setName(updates.getName());
        if (updates.getClassName() != null) existing.setClassName(updates.getClassName());
        if (updates.getSection() != null) existing.setSection(updates.getSection());
        if (updates.getEmail() != null) existing.setEmail(updates.getEmail());
        if (updates.getPhone() != null) existing.setPhone(updates.getPhone());
        if (updates.getFaceDescriptor() != null) existing.setFaceDescriptor(updates.getFaceDescriptor());
        if (updates.getFaceImages() != null) existing.setFaceImages(updates.getFaceImages());

        Student saved = repository.save(existing);
        Hibernate.initialize(saved.getFaceImages());
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable("id") String id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    private static boolean isValidDescriptor(List<Float> descriptor) {
        return descriptor == null || descriptor.isEmpty() || descriptor.size() == DESCRIPTOR_LENGTH;
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private static ResponseEntity<Object> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }
}
