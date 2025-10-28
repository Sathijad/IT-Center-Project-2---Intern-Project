package com.itcenter.auth.it;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for /api/v1/me endpoint
 */
@SpringBootTest
@AutoConfigureMockMvc
class MeApiIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    private AppUser testUser;
    private Role adminRole;
    private Role employeeRole;

    @BeforeEach
    void setUp() {
        // Create test roles
        adminRole = new Role();
        adminRole.setName("ADMIN");
        adminRole = roleRepository.save(adminRole);

        employeeRole = new Role();
        employeeRole.setName("EMPLOYEE");
        employeeRole = roleRepository.save(employeeRole);

        // Create test user with ADMIN role
        testUser = new AppUser();
        testUser.setCognitoSub("test-sub-" + System.currentTimeMillis());
        testUser.setEmail("test@example.com");
        testUser.setDisplayName("Test User");
        testUser.setLocale("en");
        testUser.setIsActive(true);
        testUser.setRoles(List.of(adminRole));
        testUser = userRepository.save(testUser);
    }

    @Test
    void me_Returns200_WithValidJWT() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                        .claim("email", testUser.getEmail())
                                        .claim("name", testUser.getDisplayName()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email", is(testUser.getEmail())))
                .andExpect(jsonPath("$.displayName", is(testUser.getDisplayName())))
                .andExpect(jsonPath("$.roles", hasItem("ADMIN")));
    }

    @Test
    void me_Returns401_WithoutJWT() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void updateMe_UpdatesProfileSuccessfully() throws Exception {
        String newDisplayName = "Updated Name";
        
        mockMvc.perform(patch("/api/v1/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format(
                                "{\"displayName\":\"%s\",\"locale\":\"fr\"}", newDisplayName))
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                        .claim("email", testUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is(newDisplayName)))
                .andExpect(jsonPath("$.locale", is("fr")));
    }
}

