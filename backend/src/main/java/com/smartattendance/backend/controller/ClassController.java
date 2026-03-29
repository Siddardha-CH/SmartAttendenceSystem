package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.ClassEntity;
import com.smartattendance.backend.repository.ClassRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/classes")
@CrossOrigin(origins = "*")
public class ClassController {

    @Autowired
    private ClassRepository repository;

    @GetMapping
    public List<ClassEntity> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public ClassEntity create(@RequestBody ClassEntity classEntity) {
        classEntity.setId(UUID.randomUUID().toString());
        classEntity.setCreatedAt(new Date());
        return repository.save(classEntity);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClassEntity> update(@PathVariable("id") String id, @RequestBody ClassEntity classDetails) {
        return repository.findById(id).map(classEntity -> {
            classEntity.setName(classDetails.getName());
            classEntity.setInstituteId(classDetails.getInstituteId());
            return ResponseEntity.ok(repository.save(classEntity));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable("id") String id) {
        if (repository.existsById(id)) {
            repository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }
}
