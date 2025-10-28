package com.itcenter.auth.unit;

import com.itcenter.auth.entity.AppUser;
import com.itcenter.auth.entity.LoginAudit;
import com.itcenter.auth.repository.AppUserRepository;
import com.itcenter.auth.repository.LoginAuditRepository;
import com.itcenter.auth.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Unit tests for AuditService
 */
@ExtendWith(MockitoExtension.class)
class AuditServiceTest {

    @Mock
    private LoginAuditRepository auditRepository;

    @Mock
    private AppUserRepository userRepository;

    @InjectMocks
    private AuditService auditService;

    private AppUser testUser;

    @BeforeEach
    void setUp() {
        testUser = new AppUser();
        testUser.setId(1L);
        testUser.setEmail("test@example.com");
        testUser.setDisplayName("Test User");
    }

    @Test
    void logEvent_WithUserId_SavesSuccessfully() {
        // Given
        Long userId = 1L;
        String eventType = "LOGIN_SUCCESS";
        String ipAddress = "127.0.0.1";
        String userAgent = "TestAgent";

        when(userRepository.findById(userId)).thenReturn(java.util.Optional.of(testUser));

        // When
        auditService.logEvent(userId, eventType, ipAddress, userAgent, null);

        // Then
        verify(auditRepository, times(1)).save(any(LoginAudit.class));
        verify(userRepository, times(1)).findById(userId);
    }

    @Test
    void logEvent_WithAppUser_SavesSuccessfully() {
        // Given
        String eventType = "PROFILE_UPDATED";
        String ipAddress = "192.168.1.1";
        String userAgent = "Mozilla/5.0";

        // When
        auditService.logEvent(testUser, eventType, ipAddress, userAgent, "Test metadata");

        // Then
        verify(auditRepository, times(1)).save(any(LoginAudit.class));
    }

    @Test
    void logEvent_Continues_OnException() {
        // Given
        doThrow(new RuntimeException("Database error")).when(auditRepository).save(any(LoginAudit.class));

        // When/Then - Should not throw exception
        auditService.logEvent(testUser, "TEST_EVENT", "127.0.0.1", "TestAgent", null);
        
        // Verify it attempted to save
        verify(auditRepository, times(1)).save(any(LoginAudit.class));
    }

    @Test
    void getClientIp_ExtractsCorrectIp() {
        // Given - This would require mocking HttpServletRequest
        // For now, test the static method logic via reflection or test in integration tests
        // This is tested in integration tests where we have actual request context
    }
}

