package com.itcenter.auth.it;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.LoginAudit;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.entity.UserRole;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.LoginAuditRepository;
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
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for /api/v1/admin/users endpoints
 */
@SpringBootTest
@AutoConfigureMockMvc
class AdminUsersApiIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    @Autowired
    private LoginAuditRepository auditRepository;

    private AppUser adminUser;
    private AppUser targetUser;
    private Role adminRole;
    private Role employeeRole;

    @BeforeEach
    void setUp() {
        // Find or create test roles to avoid unique constraint violations
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

        // Create admin user (unique email)
        adminUser = new AppUser();
        adminUser.setCognitoSub("admin-sub-" + System.currentTimeMillis());
        adminUser.setEmail("admin+" + java.util.UUID.randomUUID() + "@test.com");
        adminUser.setDisplayName("Admin User");
        adminUser.setLocale("en");
        adminUser.setIsActive(true);
        adminUser = userRepository.save(adminUser);
        // Assign role using UserRole entity
        UserRole adminUserRole = UserRole.builder()
            .user(adminUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        userRoleRepository.save(adminUserRole);

        // Create target user (unique email)
        targetUser = new AppUser();
        targetUser.setCognitoSub("target-sub-" + System.currentTimeMillis());
        targetUser.setEmail("target+" + java.util.UUID.randomUUID() + "@test.com");
        targetUser.setDisplayName("Target User");
        targetUser.setLocale("en");
        targetUser.setIsActive(true);
        targetUser = userRepository.save(targetUser);
        // Assign role using UserRole entity
        UserRole targetUserRole = UserRole.builder()
            .user(targetUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        userRoleRepository.save(targetUserRole);
    }

    @Test
    void listUsers_Returns200_WithAdminRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(2)));
    }

    @Test
    void listUsers_Returns403_WithEmployeeRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/users")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", "employee@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void updateUserRoles_Returns200_AndLogsAudit() throws Exception {
        // Given - update roles from EMPLOYEE to ADMIN,EMPLOYEE
        String requestBody = "{\"roles\":[\"ADMIN\",\"EMPLOYEE\"]}";

        // Get initial audit count
        long initialAuditCount = auditRepository.count();

        // When
        mockMvc.perform(patch("/api/v1/admin/users/" + targetUser.getId() + "/roles")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody)
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id", is(targetUser.getId().intValue())))
                .andExpect(jsonPath("$.roles", hasItems("ADMIN", "EMPLOYEE")));

        // Then - verify audit log was created
        long finalAuditCount = auditRepository.count();
        assertThat(finalAuditCount).isGreaterThan(initialAuditCount);

        // Verify audit entries exist for role changes
        List<LoginAudit> audits = auditRepository.findAll();
        assertThat(audits).anyMatch(a -> 
            a.getEventType().equals("ROLE_ASSIGNED") || 
            a.getEventType().equals("ROLE_REMOVED"));
    }
}

