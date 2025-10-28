package com.itcenter.auth.it;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for HealthController
 */
@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void healthz_ReturnsOk() throws Exception {
        mockMvc.perform(get("/healthz"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status", is("UP")));
    }

    @Test
    void healthz_IsPublic_NoAuthentication() throws Exception {
        // Health endpoint should be accessible without authentication
        mockMvc.perform(get("/healthz"))
                .andExpect(status().isOk());
    }
}

