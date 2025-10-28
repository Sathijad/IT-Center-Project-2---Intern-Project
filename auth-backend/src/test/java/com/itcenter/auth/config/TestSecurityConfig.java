package com.itcenter.auth.config;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;

/**
 * Test configuration to mock JWT decoder for integration tests
 */
@TestConfiguration
public class TestSecurityConfig {
    
    @MockBean
    private JwtDecoder jwtDecoder;
}

