package com.itcenter.auth.unit;

import com.itcenter.auth.dto.UpdateProfileRequest;
import com.itcenter.auth.dto.UserProfileResponse;
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

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for UserService updateProfile method
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceUpdateProfileTest {

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

    @BeforeEach
    void setUp() {
        // Setup SecurityContext
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(jwt);
        when(jwt.getClaimAsString("sub")).thenReturn("test-sub-123");
        when(jwt.getClaimAsString("email")).thenReturn("test@example.com");

        // Create test user
        testUser = new AppUser();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setDisplayName("Original Name");
        testUser.setLocale("en");
        testUser.setIsActive(true);

        Role adminRole = new Role();
        adminRole.setId(1L);
        adminRole.setName("ADMIN");
        testUser.setRoles(List.of(adminRole));
    }

    @Test
    void updateProfile_UpdatesDisplayName() {
        // Given
        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(testUser);
        when(userRepository.saveAndFlush(any(AppUser.class))).thenReturn(testUser);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("New Display Name");

        // When
        UserProfileResponse response = userService.updateCurrentUserProfile(request);

        // Then
        assertThat(response.getDisplayName()).isEqualTo("New Display Name");
        verify(userRepository, times(1)).saveAndFlush(any(AppUser.class));
        verify(auditService, times(1)).logEvent(any(AppUser.class), eq("PROFILE_UPDATED"), 
            any(), any(), any());
    }

    @Test
    void updateProfile_UpdatesLocale() {
        // Given
        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(testUser);
        when(userRepository.saveAndFlush(any(AppUser.class))).thenReturn(testUser);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setLocale("si");

        // When
        UserProfileResponse response = userService.updateCurrentUserProfile(request);

        // Then
        assertThat(response.getLocale()).isEqualTo("si");
        verify(userRepository, times(1)).saveAndFlush(any(AppUser.class));
    }

    @Test
    void updateProfile_UpdatesBothFields() {
        // Given
        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(testUser);
        when(userRepository.saveAndFlush(any(AppUser.class))).thenReturn(testUser);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("Updated Name");
        request.setLocale("ta");

        // When
        UserProfileResponse response = userService.updateCurrentUserProfile(request);

        // Then
        assertThat(response.getDisplayName()).isEqualTo("Updated Name");
        assertThat(response.getLocale()).isEqualTo("ta");
        verify(userRepository, times(1)).saveAndFlush(any(AppUser.class));
    }

    @Test
    void updateProfile_NoChanges_DoesNotSave() {
        // Given
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("Original Name");
        request.setLocale("en");

        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(testUser);

        // When
        UserProfileResponse response = userService.updateCurrentUserProfile(request);

        // Then
        assertThat(response.getDisplayName()).isEqualTo("Original Name");
        assertThat(response.getLocale()).isEqualTo("en");
        verify(userRepository, never()).saveAndFlush(any(AppUser.class));
    }

    @Test
    void updateProfile_TrimsWhitespace() {
        // Given
        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(testUser);
        when(userRepository.saveAndFlush(any(AppUser.class))).thenReturn(testUser);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("  Trimmed Name  ");
        request.setLocale("  si  ");

        // When
        UserProfileResponse response = userService.updateCurrentUserProfile(request);

        // Then
        assertThat(response.getDisplayName()).isEqualTo("Trimmed Name");
        assertThat(response.getLocale()).isEqualTo("si");
        verify(userRepository, times(1)).saveAndFlush(any(AppUser.class));
    }

    @Test
    void updateProfile_EmptyStrings_NoChange() {
        // Given
        when(provisioningService.findOrCreateFromJwt(any(Jwt.class))).thenReturn(testUser);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setDisplayName("");
        request.setLocale("");

        // When
        UserProfileResponse response = userService.updateCurrentUserProfile(request);

        // Then
        assertThat(response.getDisplayName()).isEqualTo("Original Name");
        assertThat(response.getLocale()).isEqualTo("en");
        verify(userRepository, never()).saveAndFlush(any(AppUser.class));
    }
}

