package com.itcenter.auth.config;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Arrays;
import java.util.List;
import java.util.ArrayList;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(prePostEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {

    @Value("${app.cors-allowed-origins}")
    private String allowedOrigins;
    
    private final JwtAuthConverter jwtAuthConverter;
    private final Environment environment;

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
        // Parse allowed origins from configuration
        List<String> configuredOrigins = new ArrayList<>();
        for (String origin : allowedOrigins.split(",")) {
            configuredOrigins.add(origin.trim());
        }
        
        // In development, allow all localhost origins (Flutter web uses random ports)
        boolean isDevelopment = Arrays.asList(environment.getActiveProfiles()).contains("dev") ||
                                !Arrays.asList(environment.getActiveProfiles()).contains("prod");
        
        final boolean devMode = isDevelopment;
        final List<String> allowedOriginsList = configuredOrigins;
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource() {
            @Override
            public CorsConfiguration getCorsConfiguration(HttpServletRequest request) {
                CorsConfiguration config = new CorsConfiguration();
                config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
                config.setAllowedHeaders(Arrays.asList("*"));
                config.setExposedHeaders(Arrays.asList("X-Request-Id", "X-Correlation-Id"));
                config.setAllowCredentials(true);
                config.setMaxAge(3600L);
                
                String origin = request.getHeader("Origin");
                if (origin != null) {
                    // Check if origin is in configured list
                    if (allowedOriginsList.contains(origin)) {
                        config.setAllowedOrigins(Arrays.asList(origin));
                    }
                    // In development, allow any localhost origin (for Flutter web random ports)
                    else if (devMode && (origin.startsWith("http://localhost:") || 
                                        origin.startsWith("http://127.0.0.1:") ||
                                        origin.equals("http://localhost") ||
                                        origin.equals("http://127.0.0.1"))) {
                        config.setAllowedOrigins(Arrays.asList(origin));
                    }
                    // If no match, return null to deny
                    else {
                        return null;
                    }
                } else {
                    // No origin header, allow configured origins
                    config.setAllowedOrigins(allowedOriginsList);
                }
                
                return config;
            }
        };
        
        return source;
    }

}

