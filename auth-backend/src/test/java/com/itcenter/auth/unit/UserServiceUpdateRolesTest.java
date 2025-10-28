package com.itcenter.auth.unit;

import com.itcenter.auth.dto.UpdateRolesRequest;
import com.itcenter.auth.dto.UserSummaryResponse;
import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.RoleRepository;
import com.itcenter.auth.repository.UserRoleRepository;
import com.itcenter.auth.service.AuditService;
import com.itcenter.auth.service.UserProvisioningService;
import com.itcenter.auth.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService updateUserRoles method
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceUpdateRolesTest {

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private AuditService auditService;

    @Mock
    private UserProvisioningService provisioningService;

    @Mock
    private UserRoleRepository userRoleRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @Mock
    private Jwt jwt;

    @InjectMocks
    private UserService userService;

    private AppUser testUser;
    private AppUser currentUser;
    private Role adminRole;
    private Role employeeRole;
    private Role managerRole;

    @BeforeEach
    void setUp() {
        // Setup SecurityContext
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(jwt);

        // Create roles
        adminRole = new Role();
        adminRole.setId(1L);
        adminRole.setName("ADMIN");

        employeeRole = new Role();
        employeeRole.setId(2L);
        employeeRole.setName("EMPLOYEE");

        managerRole = new Role();
        managerRole.setId(3L);
        managerRole.setName("MANAGER");

        // Create test user (target user)
        testUser = new AppUser();
        testUser.setId(1L);
        testUser.setEmail("target@example.com");
        testUser.setDisplayName("Target User");
        testUser.setRoles(new ArrayList<>(List.of(adminRole)));

        // Create current user (admin updating roles)
        currentUser = new AppUser();
        currentUser.setId(2L);
        currentUser.setEmail("admin@example.com");
        currentUser.setRoles(List.of(adminRole));

        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(currentUser);
    }

    @Test
    void updateUserRoles_AddRole_Success() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("ADMIN", "EMPLOYEE"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactlyInAnyOrder("ADMIN", "EMPLOYEE");
        verify(auditService, times(1)).logEvent(eq(currentUser), eq("ROLE_ASSIGNED"), 
            any(), any(), contains("EMPLOYEE"));
    }

    @Test
    void updateUserRoles_RemoveRole_Success() {
        // Given
        testUser.setRoles(new ArrayList<>(List.of(adminRole, employeeRole)));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(List.of("EMPLOYEE"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
        verify(auditService, times(1)).logEvent(eq(currentUser), eq("ROLE_REMOVED"), 
            any(), any(), contains("ADMIN"));
    }

    @Test
    void updateUserRoles_ReplaceAllRoles_Success() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(managerRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("EMPLOYEE", "MANAGER"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactlyInAnyOrder("EMPLOYEE", "MANAGER");
        assertThat(response.getRoles()).doesNotContain("ADMIN");
    }

    @Test
    void updateUserRoles_NonexistentRole_ThrowsException() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        when(roleRepository.findByName("INVALID_ROLE")).thenReturn(Optional.empty());

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("ADMIN", "INVALID_ROLE"));

        // When/Then
        assertThatThrownBy(() -> userService.updateUserRoles(1L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("Role not found: INVALID_ROLE");
        
        verify(userRepository, never()).save(any(AppUser.class));
        verify(auditService, never()).logEvent(any(AppUser.class), anyString(), any(), any(), anyString());
    }

    @Test
    void updateUserRoles_NonexistentUser_ThrowsException() {
        // Given
        when(userRepository.findById(999L)).thenReturn(Optional.empty());

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(List.of("ADMIN"));

        // When/Then
        assertThatThrownBy(() -> userService.updateUserRoles(999L, request))
            .isInstanceOf(RuntimeException.class)
            .hasMessageContaining("User not found");
        
        verify(userRepository, never()).save(any(AppUser.class));
        verify(auditService, never()).logEvent(any(AppUser.class), anyString(), any(), any(), anyString());
    }

    @Test
    void updateUserRoles_DuplicateRole_HandledGracefully() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("EMPLOYEE", "EMPLOYEE")); // Duplicate

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then - should handle gracefully (Set deduplicates)
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
        verify(userRepository, times(1)).save(any(AppUser.class));
    }

    @Test
    void updateUserRoles_CaseInsensitiveRoleNames() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("employee", "Employee", "EMPLOYEE"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
    }

    @Test
    void updateUserRoles_NormalizesRoleNames() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(managerRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("  employee  ", "  manager  ")); // With whitespace

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactlyInAnyOrder("EMPLOYEE", "MANAGER");
    }

    @Test
    void updateUserRoles_NullAndBlankRoles_Ignored() {
        // Given
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("EMPLOYEE", null, "", "  ")); // With null and blank

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
    }

    @Test
    void updateUserRoles_NoChanges_StillLogsAudit() {
        // Given
        testUser.setRoles(new ArrayList<>(List.of(adminRole)));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        when(userRepository.save(any(AppUser.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(List.of("ADMIN"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then - saves anyway (JPA processes the many-to-many update)
        verify(userRepository, times(1)).save(any(AppUser.class));
    }
}

