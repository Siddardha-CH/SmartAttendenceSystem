package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.AttendanceRecord;
import com.smartattendance.backend.model.Settings;
import com.smartattendance.backend.repository.AttendanceRecordRepository;
import com.smartattendance.backend.repository.SettingsRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/api/attendance")
public class AttendanceController {

    private static final Pattern DATE = Pattern.compile("\\d{4}-\\d{2}-\\d{2}");      // yyyy-MM-dd
    private static final Pattern TIME = Pattern.compile("\\d{2}:\\d{2}(:\\d{2})?");   // HH:mm[:ss]
    private static final Set<String> STATUSES = Set.of("present", "late", "absent");
    private static final Set<String> MARKED_BY = Set.of("face-recognition", "manual");

    private final AttendanceRecordRepository repository;
    private final SettingsRepository settingsRepository;

    /** Serialises "check for duplicate, then insert" so two overlapping scans can't both insert. */
    private final Object insertLock = new Object();

    public AttendanceController(AttendanceRecordRepository repository, SettingsRepository settingsRepository) {
        this.repository = repository;
        this.settingsRepository = settingsRepository;
    }

    @GetMapping
    public List<AttendanceRecord> getAllAttendance() {
        return repository.findAll();
    }

    @GetMapping("/date/{date}")
    public List<AttendanceRecord> getAttendanceByDate(@PathVariable("date") String date) {
        return repository.findByDate(date);
    }

    /**
     * Records attendance. If duplicate protection is on and the student already has a record for
     * that date, responds 409 Conflict with the existing record instead of creating a second one.
     */
    @PostMapping
    public ResponseEntity<Object> addAttendance(@RequestBody AttendanceRecord record) {
        if (record.getStudentId() == null || record.getStudentId().isBlank()
                || record.getDate() == null || !DATE.matcher(record.getDate()).matches()
                || record.getTime() == null || !TIME.matcher(record.getTime()).matches()) {
            return badRequest("studentId, date (yyyy-MM-dd) and time (HH:mm:ss) are required");
        }
        if (record.getStatus() == null || !STATUSES.contains(record.getStatus())) {
            return badRequest("status must be present, late or absent");
        }
        if (record.getMarkedBy() == null) record.setMarkedBy("manual");
        if (!MARKED_BY.contains(record.getMarkedBy())) {
            return badRequest("markedBy must be face-recognition or manual");
        }

        Settings settings = settingsRepository.findById(Settings.DEFAULT_ID).orElseGet(Settings::defaults);
        if ("manual".equals(record.getMarkedBy()) && Boolean.FALSE.equals(settings.getAllowManualOverride())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("error", "Manual attendance is disabled in Settings"));
        }

        synchronized (insertLock) {
            if (!Boolean.FALSE.equals(settings.getDuplicateProtection())) {
                Optional<AttendanceRecord> existing = repository.findFirstByDateAndStudentId(record.getDate(), record.getStudentId());
                if (existing.isPresent()) {
                    return ResponseEntity.status(HttpStatus.CONFLICT)
                            .body(Map.of("error", "Attendance already marked for this student today", "record", existing.get()));
                }
            }
            record.setId(UUID.randomUUID().toString());
            return ResponseEntity.ok(repository.save(record));
        }
    }

    @PostMapping("/check-duplicate")
    public ResponseEntity<Map<String, Boolean>> checkDuplicate(@RequestBody Map<String, String> payload) {
        String studentId = payload.get("studentId");
        String date = payload.get("date");
        boolean exists = repository.findFirstByDateAndStudentId(date, studentId).isPresent();
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    /** Admin only (enforced in AuthInterceptor). */
    @DeleteMapping("/clear-history")
    public ResponseEntity<Void> clearHistory() {
        repository.deleteAll();
        return ResponseEntity.ok().build();
    }

    private static ResponseEntity<Object> badRequest(String message) {
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }
}
