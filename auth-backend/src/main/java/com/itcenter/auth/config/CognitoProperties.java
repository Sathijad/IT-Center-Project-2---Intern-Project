package com.itcenter.auth.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "cognito")
@Getter
@Setter
public class CognitoProperties {
    private String userPoolId;
    private String clientId;
    private String issuerUri;
    private String jwkSetUri;
    private String domain;
    private String region;
}

