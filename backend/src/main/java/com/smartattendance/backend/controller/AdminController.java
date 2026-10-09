package com.smartattendance.backend.controller;

import com.smartattendance.backend.model.Settings;
import com.smartattendance.backend.repository.*;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Admin-only maintenance actions (the /api/admin prefix is restricted in AuthInterceptor). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AttendanceRecordRepository attendanceRepository;
    private final StudentRepository studentRepository;
    private final ClassRepository classRepository;
    private final InstituteRepository instituteRepository;
    private final UserPreferencesRepository preferencesRepository;
    private final SettingsRepository settingsRepository;

    public AdminController(AttendanceRecordRepository attendanceRepository, StudentRepository studentRepository,
                           ClassRepository classRepository, InstituteRepository instituteRepository,
                           UserPreferencesRepository preferencesRepository, SettingsRepository settingsRepository) {
        this.attendanceRepository = attendanceRepository;
        this.studentRepository = studentRepository;
        this.classRepository = classRepository;
        this.instituteRepository = instituteRepository;
        this.preferencesRepository = preferencesRepository;
        this.settingsRepository = settingsRepository;
    }

    /**
     * Factory reset: deletes all attendance, students, classes, institutes and preferences, and
     * restores default settings. User accounts are kept so nobody gets locked out.
     */
    @PostMapping("/reset")
    @Transactional
    public ResponseEntity<Void> factoryReset() {
        attendanceRepository.deleteAllInBatch();
        studentRepository.deleteAll(); // not "InBatch": the face-image child rows must be deleted too
        classRepository.deleteAllInBatch();
        instituteRepository.deleteAllInBatch();
        preferencesRepository.deleteAllInBatch();
        settingsRepository.save(Settings.defaults());
        return ResponseEntity.ok().build();
    }
}
