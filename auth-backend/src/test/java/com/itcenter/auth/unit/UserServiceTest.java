package com.itcenter.auth.unit;

import com.itcenter.auth.dto.UpdateProfileRequest;
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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService
 */
@ExtendWith(MockitoExtension.class)
class UserServiceTest {

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

    @InjectMocks
    private UserService userService;

    private AppUser testUser;
    private Jwt mockJwt;

    @BeforeEach
    void setUp() {
        // Create test user
        testUser = new AppUser();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setDisplayName("Test User");
        testUser.setLocale("en");
        testUser.setIsActive(true);

        Role adminRole = new Role();
        adminRole.setId(1L);
        adminRole.setName("ADMIN");
        testUser.setRoles(List.of(adminRole));

        // Create mock JWT
        mockJwt = Jwt.withTokenValue("mock-token")
                .claim("sub", "test-sub")
                .claim("email", "test@example.com")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .build();

        // Setup SecurityContext
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(mockJwt);
    }

    @Test
    void searchUsers_ReturnsPagedResults() {
        // Given
        List<AppUser> users = List.of(testUser);
        Page<AppUser> userPage = new PageImpl<>(users);
        when(userRepository.findAll(any(Pageable.class))).thenReturn(userPage);

        // When
        Pageable pageable = mock(Pageable.class);
        var result = userService.searchUsers(null, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(userRepository, times(1)).findAll(any(Pageable.class));
    }

    @Test
    void searchUsers_WithQuery_FiltersResults() {
        // Given
        String query = "test";
        List<AppUser> users = List.of(testUser);
        Page<AppUser> userPage = new PageImpl<>(users);
        when(userRepository.searchUsers(query, any(Pageable.class))).thenReturn(userPage);

        // When
        Pageable pageable = mock(Pageable.class);
        var result = userService.searchUsers(query, pageable);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        verify(userRepository, times(1)).searchUsers(query, any(Pageable.class));
    }

    @Test
    void getUserById_ReturnsUser_WhenExists() {
        // Given
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

        // When
        var result = userService.getUserById(userId);

        // Then
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(userId);
        assertThat(result.getEmail()).isEqualTo("test@example.com");
    }

    @Test
    void getUserById_ThrowsException_WhenNotExists() {
        // Given
        Long userId = 999L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // When/Then
        try {
            userService.getUserById(userId);
            assertThat(false).isTrue(); // Should not reach here
        } catch (RuntimeException e) {
            assertThat(e.getMessage()).contains("not found");
        }
    }
}

