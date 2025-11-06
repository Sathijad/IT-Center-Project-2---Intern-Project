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
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for UserController
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserControllerIT {

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
        // Find or create roles to avoid duplicates
        adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin role");
            return roleRepository.save(r);
        });

        employeeRole = roleRepository.findByName("EMPLOYEE").orElseGet(() -> {
            Role r = new Role();
            r.setName("EMPLOYEE");
            r.setDescription("Employee role");
            return roleRepository.save(r);
        });

        // Create test user with ADMIN role (unique email)
        testUser = new AppUser();
        testUser.setCognitoSub("test-sub-" + System.currentTimeMillis());
        testUser.setEmail("test+" + java.util.UUID.randomUUID() + "@example.com");
        testUser.setDisplayName("Test User");
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
    void me_ReturnsUserProfile() throws Exception {
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
    void updateMe_UpdatesProfile() throws Exception {
        String newDisplayName = "Updated User Name";
        
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

    @Test
    void listUsers_RequiresAdminRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", testUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(1)));
    }
}

