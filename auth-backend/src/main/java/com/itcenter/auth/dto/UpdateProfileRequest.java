package com.itcenter.auth.dto;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(max = 80, message = "Display name must not exceed 80 characters")
    private String displayName;
    
    @Pattern(regexp = "^[a-z]{2,3}(-[A-Z]{2,4})?(-[A-Z0-9]+)?$", message = "Locale must be in format like 'en', 'en-US', 'en-GB', etc.")
    private String locale;
}

