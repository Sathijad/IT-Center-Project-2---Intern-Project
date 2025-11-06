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
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Comprehensive integration tests for API endpoints using MockMvc
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiEndpointIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    private AppUser testUser;
    private AppUser adminUser;
    private AppUser employeeUser;
    private Role adminRole;
    private Role employeeRole;
    private Role managerRole;

    @BeforeEach
    void setUp() {
        // Find or create roles
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

        managerRole = roleRepository.findByName("MANAGER").orElseGet(() -> {
            Role r = new Role();
            r.setName("MANAGER");
            r.setDescription("Manager role");
            return roleRepository.save(r);
        });

        // Create admin user
        adminUser = new AppUser();
        adminUser.setCognitoSub("admin-sub-" + System.currentTimeMillis());
        adminUser.setEmail("admin+" + UUID.randomUUID() + "@example.com");
        adminUser.setDisplayName("Admin User");
        adminUser.setLocale("en");
        adminUser.setIsActive(true);
        adminUser = userRepository.save(adminUser);
        // Assign role using UserRole entity
        UserRole adminUserRole = UserRole.builder()
            .user(adminUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null) // System assignment in tests
            .build();
        userRoleRepository.save(adminUserRole);

        // Create test user
        testUser = new AppUser();
        testUser.setCognitoSub("user-sub-" + System.currentTimeMillis());
        testUser.setEmail("user+" + UUID.randomUUID() + "@example.com");
        testUser.setDisplayName("Test User");
        testUser.setLocale("en");
        testUser.setIsActive(true);
        testUser = userRepository.save(testUser);
        // Assign role using UserRole entity
        UserRole testUserRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(null) // System assignment in tests
            .build();
        userRoleRepository.save(testUserRole);

        // Create employee user
        employeeUser = new AppUser();
        employeeUser.setCognitoSub("emp-sub-" + System.currentTimeMillis());
        employeeUser.setEmail("emp+" + UUID.randomUUID() + "@example.com");
        employeeUser.setDisplayName("Employee User");
        employeeUser.setLocale("en");
        employeeUser.setIsActive(true);
        employeeUser = userRepository.save(employeeUser);
        // Assign role using UserRole entity
        UserRole empUserRole = UserRole.builder()
            .user(employeeUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(null) // System assignment in tests
            .build();
        userRoleRepository.save(empUserRole);
    }

    // GET /api/v1/me tests
    @Test
    void testGetMe_WithValidJWT_Returns200() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                        .claim("email", testUser.getEmail())
                                        .claim("name", testUser.getDisplayName()))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email", is(testUser.getEmail())))
                .andExpect(jsonPath("$.displayName", is(testUser.getDisplayName())))
                .andExpect(jsonPath("$.locale", is("en")))
                .andExpect(jsonPath("$.roles", hasItem("EMPLOYEE")));
    }

    @Test
    void testGetMe_WithoutJWT_Returns401() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void testGetMe_ClaimsAreMappedCorrectly() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                        .claim("email", testUser.getEmail())
                                        .claim("name", testUser.getDisplayName()))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.createdAt", notNullValue()));
    }

    // PATCH /api/v1/me tests
    @Test
    void testUpdateMe_UpdatesProfileSuccessfully() throws Exception {
        String newDisplayName = "Updated Name";
        
        mockMvc.perform(patch("/api/v1/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(String.format(
                                "{\"displayName\":\"%s\",\"locale\":\"si\"}", newDisplayName))
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                        .claim("email", testUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.displayName", is(newDisplayName)))
                .andExpect(jsonPath("$.locale", is("si")));
    }

    @Test
    void testUpdateMe_InvalidPayload_Returns400() throws Exception {
        String invalidBody = "{\"displayName\":\"" + "a".repeat(100) + "\"}";
        
        mockMvc.perform(patch("/api/v1/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidBody)
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", testUser.getCognitoSub())
                                        .claim("email", testUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isBadRequest());
    }

    // PATCH /api/v1/admin/users/{id}/roles tests
    @Test
    void testUpdateUserRoles_AddRoles_Returns200() throws Exception {
        String body = "{\"roles\":[\"EMPLOYEE\",\"MANAGER\"]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", hasItems("EMPLOYEE", "MANAGER")));
    }

    @Test
    void testUpdateUserRoles_RemoveRoles_Returns200() throws Exception {
        // First add roles using UserRole entities
        UserRole testUserAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        userRoleRepository.save(testUserAdminRole);
        // employeeRole is already assigned in setUp, so we don't need to add it again
        
        String body = "{\"roles\":[\"EMPLOYEE\"]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.roles", hasItem("EMPLOYEE")))
                .andExpect(jsonPath("$.roles", not(hasItem("ADMIN"))));
    }

    @Test
    void testUpdateUserRoles_UnknownRole_Returns404() throws Exception {
        String body = "{\"roles\":[\"INVALID_ROLE\"]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", containsString("Role not found")));
    }

    @Test
    void testGetUserById_NonExistentUser_Returns404() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users/{id}", 99999L)
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", not(emptyOrNullString())));
    }

    @Test
    void testUpdateUserRoles_NonExistentUser_Returns404() throws Exception {
        String body = "{\"roles\":[\"EMPLOYEE\"]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", 99999L)
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error", not(emptyOrNullString())));
    }


    @Test
    void testUpdateUserRoles_EmptyRolesList_Handled() throws Exception {
        String body = "{\"roles\":[]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest()); // Validation error
    }

    @Test
    void testUpdateUserRoles_RequiresAdminRole_Returns403() throws Exception {
        String body = "{\"roles\":[\"ADMIN\"]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", employeeUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isForbidden());
    }

    @Test
    void testUpdateUserRoles_WithoutAuth_Returns401() throws Exception {
        String body = "{\"roles\":[\"EMPLOYEE\"]}";
        
        mockMvc.perform(patch("/api/v1/admin/users/{id}/roles", testUser.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());
    }

    // GET /healthz tests
    @Test
    void testGetHealthz_Returns200() throws Exception {
        mockMvc.perform(get("/healthz"))
                .andExpect(status().isOk());
    }

    // GET /api/v1/admin/users tests
    @Test
    void testListUsers_WithAdminRole_Returns200() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("sub", adminUser.getCognitoSub())
                                        .claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .queryParam("page", "0")
                        .queryParam("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", is(notNullValue())))
                .andExpect(jsonPath("$.totalElements", greaterThan(0)));
    }

    @Test
    void testListUsers_WithoutAdminRole_Returns403() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", employeeUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden());
    }
}

