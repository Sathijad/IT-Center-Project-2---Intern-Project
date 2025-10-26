package com.itcenter.auth.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class UpdateRolesRequest {
    @NotEmpty(message = "At least one role must be specified")
    private List<String> roles;
}

