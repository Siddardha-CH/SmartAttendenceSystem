package com.smartattendance.backend;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartattendance.backend.model.User;
import com.smartattendance.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.util.Collections;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end API tests. Spring starts the whole app against an in-memory H2 database
 * (see src/test/resources/application.properties) and MockMvc sends HTTP requests to it.
 */
@SpringBootTest
@AutoConfigureMockMvc
class BackendApplicationTests {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository userRepository;

    private String adminToken;

    @BeforeEach
    void logInAsAdmin() throws Exception {
        adminToken = login("admin@school.edu", "admin123");
    }

    @Test
    void healthIsPublic() throws Exception {
        mvc.perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void apiRequiresToken() throws Exception {
        mvc.perform(get("/api/students")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/students").header("Authorization", "Bearer forged.token")).andExpect(status().isUnauthorized());
    }

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/users/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@school.edu\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordsAreHashedAndNeverReturned() throws Exception {
        User admin = userRepository.findByEmailIgnoreCase("admin@school.edu").orElseThrow();
        assertThat(admin.getPassword()).startsWith("$2").isNotEqualTo("admin123");

        String body = mvc.perform(auth(get("/api/users"), adminToken))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain("password").doesNotContain("$2");
    }

    @Test
    void rolesAreEnforced() throws Exception {
        createUser("viewer@school.edu", "viewer");
        String viewerToken = login("viewer@school.edu", "secret1");

        mvc.perform(auth(get("/api/students"), viewerToken)).andExpect(status().isOk());
        mvc.perform(auth(post("/api/students"), viewerToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"X\",\"studentId\":\"V1\"}")).andExpect(status().isForbidden());
        mvc.perform(auth(get("/api/users"), viewerToken)).andExpect(status().isForbidden());
        mvc.perform(auth(get("/api/users/me"), viewerToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("viewer"));
    }

    @Test
    void settingsPartialUpdateKeepsOtherFields() throws Exception {
        mvc.perform(auth(put("/api/settings"), adminToken).contentType(MediaType.APPLICATION_JSON)
                .content("{\"duplicateProtection\":true,\"allowManualOverride\":true}")).andExpect(status().isOk());

        mvc.perform(auth(put("/api/settings"), adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"recognitionThreshold\":0.45}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recognitionThreshold").value(0.45))
                .andExpect(jsonPath("$.duplicateProtection").value(true))
                .andExpect(jsonPath("$.allowManualOverride").value(true));
    }

    @Test
    void faceDescriptorRoundTripsInOrder() throws Exception {
        String id = createStudent("FACE1");
        Float[] descriptor = new Float[128];
        for (int i = 0; i < 128; i++) descriptor[i] = i / 1000f;

        mvc.perform(auth(put("/api/students/" + id), adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("faceDescriptor", descriptor,
                                "faceImages", java.util.List.of("data:image/jpeg;base64,AAA")))))
                .andExpect(status().isOk());

        JsonNode list = json.readTree(mvc.perform(auth(get("/api/students"), adminToken))
                .andReturn().getResponse().getContentAsString());
        JsonNode student = null;
        for (JsonNode s : list) if (s.get("id").asText().equals(id)) student = s;

        assertThat(student).isNotNull();
        assertThat(student.get("faceDescriptor")).hasSize(128);
        assertThat(student.get("faceDescriptor").get(5).floatValue()).isEqualTo(0.005f);
        assertThat(student.get("faceImageCount").asInt()).isEqualTo(1);
        assertThat(student.get("faceImages").isNull()).isTrue(); // list responses skip the images
    }

    @Test
    void wrongDescriptorLengthIsRejected() throws Exception {
        String id = createStudent("FACE2");
        mvc.perform(auth(put("/api/students/" + id), adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"faceDescriptor\":[0.1,0.2]}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void duplicateStudentIdIsAConflict() throws Exception {
        createStudent("DUP1");
        mvc.perform(auth(post("/api/students"), adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Again\",\"studentId\":\"DUP1\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void attendanceIsOnlyMarkedOncePerDay() throws Exception {
        String record = "{\"studentId\":\"ATT1\",\"studentName\":\"A\",\"date\":\"2026-01-05\",\"time\":\"08:30:00\","
                + "\"status\":\"present\",\"confidence\":90,\"markedBy\":\"face-recognition\"}";
        mvc.perform(auth(post("/api/attendance"), adminToken).contentType(MediaType.APPLICATION_JSON).content(record))
                .andExpect(status().isOk());
        mvc.perform(auth(post("/api/attendance"), adminToken).contentType(MediaType.APPLICATION_JSON).content(record))
                .andExpect(status().isConflict());
        mvc.perform(auth(get("/api/attendance/date/2026-01-05"), adminToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void adminCannotDeleteThemselves() throws Exception {
        String myId = json.readTree(mvc.perform(auth(get("/api/users/me"), adminToken))
                .andReturn().getResponse().getContentAsString()).get("id").asText();
        mvc.perform(auth(delete("/api/users/" + myId), adminToken)).andExpect(status().isBadRequest());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private String login(String email, String password) throws Exception {
        String body = mvc.perform(post("/api/users/login").contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("email", email, "password", password))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private void createUser(String email, String role) throws Exception {
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) return;
        mvc.perform(auth(post("/api/users"), adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Test", "email", email, "password", "secret1", "role", role))))
                .andExpect(status().isOk());
    }

    private String createStudent(String studentId) throws Exception {
        String body = mvc.perform(auth(post("/api/students"), adminToken).contentType(MediaType.APPLICATION_JSON)
                        .content(json.writeValueAsString(Map.of("name", "Student " + studentId, "studentId", studentId,
                                "faceImages", Collections.emptyList()))))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asText();
    }

    private static MockHttpServletRequestBuilder auth(MockHttpServletRequestBuilder request, String token) {
        return request.header("Authorization", "Bearer " + token);
    }
}
