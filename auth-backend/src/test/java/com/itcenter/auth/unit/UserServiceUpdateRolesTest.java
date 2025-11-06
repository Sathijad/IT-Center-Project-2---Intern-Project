package com.itcenter.auth.unit;

import com.itcenter.auth.dto.UpdateRolesRequest;
import com.itcenter.auth.dto.UserSummaryResponse;
import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.Role;
import com.itcenter.auth.entity.UserRole;
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

import java.time.Instant;
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
        // Given - user already has ADMIN, we're adding EMPLOYEE
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        // Mock existing UserRole for ADMIN
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        // Create new UserRole for EMPLOYEE that will be added
        UserRole newEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newEmployeeRole.setId(2L);
        // Mock findByUserIdWithDetails - called multiple times:
        // 1. To get existing roles (returns ADMIN only)
        // 2. Inside loop to check if EMPLOYEE exists (returns ADMIN only)
        // 3. In mapToSummaryResponse to get final roles (returns ADMIN and EMPLOYEE)
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole))  // First call - existing roles
            .thenReturn(List.of(existingAdminRole))  // Second call - check before adding
            .thenReturn(List.of(existingAdminRole, newEmployeeRole));  // Third call - final roles
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole ur = invocation.getArgument(0);
            ur.setId(2L);
            return ur;
        });
        doNothing().when(userRoleRepository).flush();

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("ADMIN", "EMPLOYEE"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactlyInAnyOrder("ADMIN", "EMPLOYEE");
        verify(auditService, times(1)).logEvent(eq(currentUser), eq("ROLE_ASSIGNED"), 
            any(), any(), contains("EMPLOYEE"));
        verify(userRoleRepository, times(1)).saveAndFlush(any(UserRole.class));
    }

    @Test
    void updateUserRoles_RemoveRole_Success() {
        // Given - user has both ADMIN and EMPLOYEE, we're removing ADMIN
        testUser.setRoles(new ArrayList<>(List.of(adminRole, employeeRole)));
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        // Mock existing UserRoles
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        UserRole existingEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingEmployeeRole.setId(2L);
        // Mock findByUserIdWithDetails - called multiple times:
        // 1. To get existing roles (returns ADMIN and EMPLOYEE)
        // 2. In mapToSummaryResponse to get final roles (returns EMPLOYEE only after deletion)
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole, existingEmployeeRole))  // First call - existing roles
            .thenReturn(List.of(existingEmployeeRole));  // Second call - final roles after deletion
        doNothing().when(userRoleRepository).deleteByUserIdAndRoleId(1L, adminRole.getId());
        doNothing().when(userRoleRepository).flush();

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(List.of("EMPLOYEE"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
        verify(auditService, times(1)).logEvent(eq(currentUser), eq("ROLE_REMOVED"), 
            any(), any(), contains("ADMIN"));
        verify(userRoleRepository, times(1)).deleteByUserIdAndRoleId(1L, adminRole.getId());
    }

    @Test
    void updateUserRoles_ReplaceAllRoles_Success() {
        // Given - user has ADMIN, we're replacing with EMPLOYEE and MANAGER
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(managerRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        // Mock existing UserRole for ADMIN
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        // Create new UserRoles for EMPLOYEE and MANAGER
        UserRole newEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newEmployeeRole.setId(2L);
        UserRole newManagerRole = UserRole.builder()
            .user(testUser)
            .role(managerRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newManagerRole.setId(3L);
        // Mock findByUserIdWithDetails - called multiple times:
        // 1. To get existing roles (returns ADMIN only)
        // 2. Inside loop to check if EMPLOYEE exists (returns ADMIN only)
        // 3. Inside loop to check if MANAGER exists (returns ADMIN only)
        // 4. In mapToSummaryResponse to get final roles (returns EMPLOYEE and MANAGER)
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole))  // First call - existing roles
            .thenReturn(List.of(existingAdminRole))  // Second call - check EMPLOYEE
            .thenReturn(List.of(existingAdminRole))  // Third call - check MANAGER
            .thenReturn(List.of(newEmployeeRole, newManagerRole));  // Fourth call - final roles
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole ur = invocation.getArgument(0);
            if (ur.getRole().getName().equals("EMPLOYEE")) {
                ur.setId(2L);
            } else if (ur.getRole().getName().equals("MANAGER")) {
                ur.setId(3L);
            }
            return ur;
        });
        doNothing().when(userRoleRepository).deleteByUserIdAndRoleId(1L, adminRole.getId());
        doNothing().when(userRoleRepository).flush();

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
        // Given - user has ADMIN, we're replacing with EMPLOYEE (duplicate in request)
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        // Mock existing UserRole for ADMIN
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        // Create new UserRole for EMPLOYEE
        UserRole newEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newEmployeeRole.setId(2L);
        // Mock findByUserIdWithDetails - called multiple times
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole))  // First call - existing roles
            .thenReturn(List.of(existingAdminRole))  // Second call - check before adding
            .thenReturn(List.of(newEmployeeRole));  // Third call - final roles
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole ur = invocation.getArgument(0);
            ur.setId(2L);
            return ur;
        });
        doNothing().when(userRoleRepository).deleteByUserIdAndRoleId(1L, adminRole.getId());
        doNothing().when(userRoleRepository).flush();

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("EMPLOYEE", "EMPLOYEE")); // Duplicate

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then - should handle gracefully (distinct() deduplicates)
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
        verify(userRoleRepository, times(1)).saveAndFlush(any(UserRole.class));
        verify(userRoleRepository, times(1)).deleteByUserIdAndRoleId(1L, adminRole.getId());
    }

    @Test
    void updateUserRoles_CaseInsensitiveRoleNames() {
        // Given - user has ADMIN, we're replacing with EMPLOYEE (case variations)
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        // Mock existing UserRole for ADMIN
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        // Create new UserRole for EMPLOYEE
        UserRole newEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newEmployeeRole.setId(2L);
        // Mock findByUserIdWithDetails - called multiple times
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole))  // First call - existing roles
            .thenReturn(List.of(existingAdminRole))  // Second call - check before adding
            .thenReturn(List.of(newEmployeeRole));  // Third call - final roles
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole ur = invocation.getArgument(0);
            ur.setId(2L);
            return ur;
        });
        doNothing().when(userRoleRepository).deleteByUserIdAndRoleId(1L, adminRole.getId());
        doNothing().when(userRoleRepository).flush();

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("employee", "Employee", "EMPLOYEE"));

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactly("EMPLOYEE");
    }

    @Test
    void updateUserRoles_NormalizesRoleNames() {
        // Given - user has ADMIN, we're replacing with EMPLOYEE and MANAGER (with whitespace)
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("MANAGER")).thenReturn(Optional.of(managerRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        // Mock existing UserRole for ADMIN
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        // Create new UserRoles for EMPLOYEE and MANAGER
        UserRole newEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newEmployeeRole.setId(2L);
        UserRole newManagerRole = UserRole.builder()
            .user(testUser)
            .role(managerRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newManagerRole.setId(3L);
        // Mock findByUserIdWithDetails - called multiple times
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole))  // First call - existing roles
            .thenReturn(List.of(existingAdminRole))  // Second call - check EMPLOYEE
            .thenReturn(List.of(existingAdminRole))  // Third call - check MANAGER
            .thenReturn(List.of(newEmployeeRole, newManagerRole));  // Fourth call - final roles
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole ur = invocation.getArgument(0);
            if (ur.getRole().getName().equals("EMPLOYEE")) {
                ur.setId(2L);
            } else if (ur.getRole().getName().equals("MANAGER")) {
                ur.setId(3L);
            }
            return ur;
        });
        doNothing().when(userRoleRepository).deleteByUserIdAndRoleId(1L, adminRole.getId());
        doNothing().when(userRoleRepository).flush();

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(Arrays.asList("  employee  ", "  manager  ")); // With whitespace

        // When
        UserSummaryResponse response = userService.updateUserRoles(1L, request);

        // Then
        assertThat(response.getRoles()).containsExactlyInAnyOrder("EMPLOYEE", "MANAGER");
    }

    @Test
    void updateUserRoles_NullAndBlankRoles_Ignored() {
        // Given - user has ADMIN, we're replacing with EMPLOYEE (with null/blank values)
        when(userRepository.findById(1L)).thenReturn(Optional.of(testUser));
        when(roleRepository.findByName("EMPLOYEE")).thenReturn(Optional.of(employeeRole));
        when(roleRepository.findByName("ADMIN")).thenReturn(Optional.of(adminRole));
        // Mock existing UserRole for ADMIN
        UserRole existingAdminRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingAdminRole.setId(1L);
        // Create new UserRole for EMPLOYEE
        UserRole newEmployeeRole = UserRole.builder()
            .user(testUser)
            .role(employeeRole)
            .assignedAt(Instant.now())
            .assignedBy(2L)
            .build();
        newEmployeeRole.setId(2L);
        // Mock findByUserIdWithDetails - called multiple times
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingAdminRole))  // First call - existing roles
            .thenReturn(List.of(existingAdminRole))  // Second call - check before adding
            .thenReturn(List.of(newEmployeeRole));  // Third call - final roles
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(invocation -> {
            UserRole ur = invocation.getArgument(0);
            ur.setId(2L);
            return ur;
        });
        doNothing().when(userRoleRepository).deleteByUserIdAndRoleId(1L, adminRole.getId());
        doNothing().when(userRoleRepository).flush();

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
        // Mock existing UserRole for ADMIN
        UserRole existingUserRole = UserRole.builder()
            .user(testUser)
            .role(adminRole)
            .assignedAt(Instant.now())
            .assignedBy(null)
            .build();
        existingUserRole.setId(1L);
        // Mock findByUserIdWithDetails - called multiple times (no changes, so same result)
        when(userRoleRepository.findByUserIdWithDetails(1L))
            .thenReturn(List.of(existingUserRole))  // First call - existing roles
            .thenReturn(List.of(existingUserRole));  // Second call - in mapToSummaryResponse

        UpdateRolesRequest request = new UpdateRolesRequest();
        request.setRoles(List.of("ADMIN"));

        // When
        userService.updateUserRoles(1L, request);

        // Then - no changes, so no save or delete operations
        verify(userRoleRepository, never()).saveAndFlush(any(UserRole.class));
        verify(userRoleRepository, never()).deleteByUserIdAndRoleId(anyLong(), anyLong());
        // Audit should still be logged (though with empty lists for additions/removals)
        // The service logs audit events for each role in rolesToAdd and rolesToRemove
        // Since both lists are empty, no audit events are logged
        verify(auditService, never()).logEvent(any(AppUser.class), anyString(), anyString(), anyString(), anyString());
    }
}

