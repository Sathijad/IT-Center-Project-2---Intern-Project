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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for AuditController
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuditControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private LoginAuditRepository auditRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRoleRepository userRoleRepository;

    private AppUser adminUser;
    private Role adminRole;

    @BeforeEach
    void setUp() {
        // Find or create admin role to avoid duplicates
        adminRole = roleRepository.findByName("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setName("ADMIN");
            r.setDescription("Admin role");
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

        // Create some audit entries
        LoginAudit audit1 = new LoginAudit();
        audit1.setUser(adminUser);
        audit1.setEventType("LOGIN_SUCCESS");
        audit1.setIpAddress("127.0.0.1");
        audit1.setUserAgent("TestAgent");
        auditRepository.save(audit1);

        LoginAudit audit2 = new LoginAudit();
        audit2.setUser(adminUser);
        audit2.setEventType("PROFILE_UPDATED");
        audit2.setIpAddress("192.168.1.1");
        auditRepository.save(audit2);
    }

    @Test
    void getAuditLog_RequiresAdminRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-log")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.content", hasSize(greaterThanOrEqualTo(1))))
                .andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(1)));
    }

    @Test
    void getAuditLog_Forbidden_WithoutAdminRole() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-log")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", "user@test.com"))
                                .authorities(new SimpleGrantedAuthority("ROLE_EMPLOYEE"))))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAuditLog_ReturnsPagedResults() throws Exception {
        mockMvc.perform(get("/api/v1/admin/audit-log")
                        .param("page", "0")
                        .param("size", "10")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()
                                .jwt(j -> j.claim("email", adminUser.getEmail()))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.number", is(0)))
                .andExpect(jsonPath("$.size", is(10)))
                .andExpect(jsonPath("$.content[0].eventType", notNullValue()))
                .andExpect(jsonPath("$.content[0].userId", notNullValue()));
    }
}

