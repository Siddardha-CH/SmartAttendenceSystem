package com.smartattendance.backend.config;

import com.smartattendance.backend.model.Settings;
import com.smartattendance.backend.model.User;
import com.smartattendance.backend.repository.SettingsRepository;
import com.smartattendance.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Date;
import java.util.UUID;

/** Runs once every time the server starts and makes sure the database has what the app needs. */
@Configuration
public class DatabaseInitConfig {

    private static final Logger log = LoggerFactory.getLogger(DatabaseInitConfig.class);

    @Bean
    public CommandLineRunner initDatabase(UserRepository userRepository,
                                          SettingsRepository settingsRepository,
                                          PasswordEncoder passwordEncoder,
                                          @Value("${app.admin.email:admin@school.edu}") String adminEmail,
                                          @Value("${app.admin.password:admin123}") String adminPassword) {
        return args -> {
            // 1. First run: create the initial admin account.
            if (userRepository.count() == 0) {
                User admin = new User();
                admin.setId(UUID.randomUUID().toString());
                admin.setEmail(adminEmail.trim().toLowerCase());
                admin.setName("Administrator");
                admin.setPassword(passwordEncoder.encode(adminPassword));
                admin.setRole("admin");
                admin.setStatus("active");
                admin.setCreatedAt(new Date());
                userRepository.save(admin);
                log.info("Created initial admin account {}", admin.getEmail());
                if ("admin123".equals(adminPassword)) {
                    log.warn("The admin account uses the default password 'admin123'. Set ADMIN_PASSWORD or change it after logging in.");
                }
            }

            // 2. Upgrade passwords saved by older versions of the app (plain text) to BCrypt hashes.
            for (User user : userRepository.findAll()) {
                String stored = user.getPassword();
                if (stored != null && !stored.startsWith("$2")) {
                    user.setPassword(passwordEncoder.encode(stored));
                    userRepository.save(user);
                    log.info("Hashed legacy plain-text password for {}", user.getEmail());
                }
            }

            // 3. Make sure the single global settings row exists.
            if (!settingsRepository.existsById(Settings.DEFAULT_ID)) {
                settingsRepository.save(Settings.defaults());
            }
        };
    }
}
