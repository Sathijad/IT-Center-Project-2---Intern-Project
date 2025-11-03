package com.itcenter.auth.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${app.cors-allowed-origins}")
    private String allowedOrigins;
    
    private final JwtAuthConverter jwtAuthConverter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/healthz", "/actuator/health").permitAll()
                .requestMatchers("/api/v1/me").authenticated()
                .requestMatchers("/api/v1/sessions/**").authenticated()  // Explicitly allow sessions endpoints
                .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")  // Only ADMIN role
                .anyRequest().authenticated()
            )
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(jwtAuthConverter))
            )
            .headers(headers -> {
                headers.frameOptions(frameOptions -> frameOptions.deny());
                headers.contentTypeOptions(contentTypeOptions -> contentTypeOptions.disable());
                headers.referrerPolicy(referrerPolicy -> referrerPolicy.policy(ReferrerPolicyHeaderWriter.ReferrerPolicy.NO_REFERRER));
            });

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        // Parse configured origins
        java.util.List<String> configuredOrigins = Arrays.asList(allowedOrigins.split(","));
        
        // Create CORS configuration using allowedOriginPatterns which supports both exact matches and wildcards
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Combine configured origins with localhost wildcard patterns
        // allowedOriginPatterns supports both exact origins and wildcard patterns like "http://localhost:*"
        java.util.List<String> originPatterns = new java.util.ArrayList<>(configuredOrigins);
        
        // For development: allow all localhost ports (Flutter web uses dynamic ports)
        // The wildcard pattern "http://localhost:*" matches any port on localhost
        originPatterns.add("http://localhost:*");
        originPatterns.add("http://127.0.0.1:*");
        
        configuration.setAllowedOriginPatterns(originPatterns);
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("X-Request-Id", "X-Correlation-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

}

