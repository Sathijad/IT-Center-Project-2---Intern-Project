package com.itcenter.auth.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 50, message = "Display name must not exceed 50 characters")
    private String displayName;
    
    @Pattern(regexp = "^[a-z]{2}-[A-Z]{2}$", message = "Locale must be in format 'en-US'")
    private String locale;
}

