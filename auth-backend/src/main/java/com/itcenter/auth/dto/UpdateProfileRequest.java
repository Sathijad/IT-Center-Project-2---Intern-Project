package com.itcenter.auth.dto;

import lombok.Data;

@Data
public class UpdateProfileRequest {
    private String displayName;
    private String locale;
}

