package com.itcenter.auth.it;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.entity.UserRole;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import com.itcenter.auth.repository.UserRoleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for PATCH /api/v1/admin/users/{id}/roles endpoint
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class RolePatchIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    private AppUser testUser;
    private Role adminRole;
    private Role employeeRole;

    @BeforeEach
    void setUp() {
        // Find or create test roles
        adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role role = new Role();
            role.setName("ADMIN");
            role.setDescription("Admin role");
            return roleRepository.save(role);
        });
        
        employeeRole = roleRepository.findByName("EMPLOYEE").orElseGet(() -> {
            Role role = new Role();
            role.setName("EMPLOYEE");
            role.setDescription("Employee role");
            return roleRepository.save(role);
        });

        // Create test user (unique email)
        testUser = new AppUser();
        testUser.setCognitoSub("patch-test-sub-" + System.currentTimeMillis());
        testUser.setEmail("patch-test+" + java.util.UUID.randomUUID() + "@example.com");
        testUser.setDisplayName("Patch Test User");
        testUser.setLocale("en");
        testUser.setIsActive(true);
        testUser = userRepository.save(testUser);
        // Assign role using UserRole entity
        UserRole testUserRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        userRoleRepository.save(testUserRole);
    }

    @Test
    void patchRoles_OkAndReturnsUpdatedRoles() throws Exception {
        String body = """
            {"roles": ["ADMIN","EMPLOYEE"]}
            """;
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(j -> j.claim("email", "admin@test.com"))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", hasItems("ADMIN", "EMPLOYEE")));
    }

    @Test
    void patchRoles_InvalidRole_Returns400() throws Exception {
        String badBody = """
            {"roles": [""]}
            """;
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(j -> j.claim("email", "admin@test.com"))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(badBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", not(emptyOrNullString())));
    }

    @Test
    void patchRoles_RequiresAuthentication() throws Exception {
        String body = """
            {"roles": ["EMPLOYEE"]}
            """;
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void patchRoles_RequiresAdminRole() throws Exception {
        String body = """
            {"roles": ["EMPLOYEE"]}
            """;
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(j -> j.claim("email", "employee@test.com"))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_EMPLOYEE")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void patchRoles_NonExistentUser_Returns404() throws Exception {
        String body = """
            {"roles": ["EMPLOYEE"]}
            """;
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", 99999L)
                .with(SecurityMockMvcRequestPostProcessors.jwt()
                        .jwt(j -> j.claim("email", "admin@test.com"))
                        .authorities(new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_ADMIN")))
                .contentType(MediaType.APPLICATION_JSON)
                .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", not(emptyOrNullString())));
    }
}

