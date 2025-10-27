package com.itcenter.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @JsonProperty("display_name")
    private String displayName;
    
    private String locale;
}

