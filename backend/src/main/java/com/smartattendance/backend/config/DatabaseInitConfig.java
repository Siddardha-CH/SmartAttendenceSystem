package com.smartattendance.backend.config;

import com.smartattendance.backend.model.Settings;
import com.smartattendance.backend.model.User;
import com.smartattendance.backend.repository.SettingsRepository;
import com.smartattendance.backend.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Date;
import java.util.UUID;

@Configuration
public class DatabaseInitConfig {

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository, SettingsRepository settingsRepository) {
        return args -> {
            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setId(UUID.randomUUID().toString());
                admin.setEmail("admin@school.edu");
                admin.setName("Administrator");
                admin.setPassword("admin123");
                admin.setRole("admin");
                admin.setStatus("active");
                admin.setCreatedAt(new Date());
                userRepository.save(admin);
            }

            if (!settingsRepository.existsById("default")) {
                Settings settings = new Settings();
                settings.setId("default");
                settings.setRecognitionThreshold(0.6f);
                settings.setFaceMatchTolerance(0.5f);
                settings.setRequiredFaceSamples(5);
                settings.setEnableFaceQualityCheck(true);
                settings.setSelectedCamera("");
                settings.setCameraResolution("high");
                settings.setMirrorCamera(false);
                settings.setLateThreshold("09:00");
                settings.setScanInterval(3000);
                settings.setDuplicateProtection(true);
                settings.setAllowManualOverride(true);
                settings.setTheme("light");
                settings.setCompactLayout(false);
                settings.setEnableAnimations(true);
                settings.setAcademicYear("2024-2025");
                settingsRepository.save(settings);
            }
        };
    }
}
