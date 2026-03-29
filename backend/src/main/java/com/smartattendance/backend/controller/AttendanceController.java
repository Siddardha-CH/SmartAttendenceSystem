package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.AttendanceRecord;
import com.smartattendance.backend.repository.AttendanceRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    @Autowired
    private AttendanceRecordRepository repository;

    @GetMapping
    public List<AttendanceRecord> getAllAttendance() {
        return repository.findAll();
    }

    @GetMapping("/date/{date}")
    public List<AttendanceRecord> getAttendanceByDate(@PathVariable("date") String date) {
        return repository.findByDate(date);
    }

    @PostMapping
    public AttendanceRecord addAttendance(@RequestBody AttendanceRecord record) {
        record.setId(UUID.randomUUID().toString());
        return repository.save(record);
    }

    @PostMapping("/check-duplicate")
    public ResponseEntity<Map<String, Boolean>> checkDuplicate(@RequestBody Map<String, String> payload) {
        String studentId = payload.get("studentId");
        String date = payload.get("date");
        boolean exists = repository.findByDateAndStudentId(date, studentId).isPresent();
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @DeleteMapping("/clear-history")
    public ResponseEntity<Void> clearHistory() {
        repository.deleteAll();
        return ResponseEntity.ok().build();
    }
}
