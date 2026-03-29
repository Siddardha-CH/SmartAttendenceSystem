package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.Institute;
import com.smartattendance.backend.repository.InstituteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/institutes")
@CrossOrigin(origins = "*")
public class InstituteController {

    @Autowired
    private InstituteRepository repository;

    @GetMapping
    public List<Institute> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Institute create(@RequestBody Institute institute) {
        institute.setId(UUID.randomUUID().toString());
        institute.setCreatedAt(new Date());
        return repository.save(institute);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Institute> update(@PathVariable("id") String id, @RequestBody Institute instituteDetails) {
        return repository.findById(id).map(institute -> {
            institute.setName(instituteDetails.getName());
            institute.setAddress(instituteDetails.getAddress());
            return ResponseEntity.ok(repository.save(institute));
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
