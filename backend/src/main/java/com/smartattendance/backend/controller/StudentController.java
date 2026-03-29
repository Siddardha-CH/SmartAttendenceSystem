package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.Student;
import com.smartattendance.backend.repository.StudentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/students")
public class StudentController {

    @Autowired
    private StudentRepository repository;

    @GetMapping
    public List<Student> getAllStudents() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Student> getStudent(@PathVariable("id") String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Student addStudent(@RequestBody Student student) {
        student.setId(UUID.randomUUID().toString());
        student.setCreatedAt(new Date());
        return repository.save(student);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Student> updateStudent(@PathVariable("id") String id, @RequestBody Student updates) {
        return repository.findById(id).map(existing -> {
            if (updates.getName() != null) existing.setName(updates.getName());
            if (updates.getStudentId() != null) existing.setStudentId(updates.getStudentId());
            if (updates.getClassName() != null) existing.setClassName(updates.getClassName());
            if (updates.getSection() != null) existing.setSection(updates.getSection());
            if (updates.getEmail() != null) existing.setEmail(updates.getEmail());
            if (updates.getPhone() != null) existing.setPhone(updates.getPhone());
            if (updates.getFaceDescriptor() != null) existing.setFaceDescriptor(updates.getFaceDescriptor());
            if (updates.getFaceImages() != null) existing.setFaceImages(updates.getFaceImages());
            return ResponseEntity.ok(repository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable("id") String id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
