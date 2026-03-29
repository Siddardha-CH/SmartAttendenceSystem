package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.User;
import com.smartattendance.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository repository;

    @PostMapping("/login")
    public ResponseEntity<User> authenticate(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");
        
        return repository.findByEmail(email).map(user -> {
            if (user.getPassword().equals(password) && "active".equals(user.getStatus())) {
                user.setLastLogin(new Date());
                repository.save(user);
                return ResponseEntity.ok(user);
            }
            return ResponseEntity.status(401).<User>build();
        }).orElse(ResponseEntity.status(401).build());
    }

    @GetMapping
    public List<User> getAllUsers() {
        return repository.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<User> getUser(@PathVariable("id") String id) {
        return repository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/email/{email}")
    public ResponseEntity<User> getUserByEmail(@PathVariable("email") String email) {
        return repository.findByEmail(email)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Object> addUser(@RequestBody User user) {
        if (repository.findByEmail(user.getEmail()).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "A user with this email already exists"));
        }
        
        user.setId(UUID.randomUUID().toString());
        user.setLastLogin(null);
        user.setCreatedAt(new Date());
        return ResponseEntity.ok(repository.save(user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> updateUser(@PathVariable("id") String id, @RequestBody User updates) {
        return repository.findById(id).<ResponseEntity<Object>>map(existing -> {
            if (updates.getEmail() != null && !updates.getEmail().equals(existing.getEmail())) {
                if (repository.findByEmail(updates.getEmail()).isPresent()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "A user with this email already exists"));
                }
                existing.setEmail(updates.getEmail());
            }
            if (updates.getName() != null) existing.setName(updates.getName());
            if (updates.getPassword() != null) existing.setPassword(updates.getPassword());
            if (updates.getRole() != null) existing.setRole(updates.getRole());
            if (updates.getStatus() != null) existing.setStatus(updates.getStatus());
            
            return ResponseEntity.ok(repository.save(existing));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable("id") String id) {
        if (!repository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        repository.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
