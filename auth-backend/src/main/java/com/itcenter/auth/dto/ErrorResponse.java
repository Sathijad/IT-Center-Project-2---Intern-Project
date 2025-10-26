package com.itcenter.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.Instant;

@Data
@Builder
@AllArgsConstructor
public class ErrorResponse {
    private String error;
    private String message;
    private String traceId;
    private String timestamp;
    
    public ErrorResponse(String error, String message, String traceId) {
        this.error = error;
        this.message = message;
        this.traceId = traceId;
        this.timestamp = Instant.now().toString();
    }
}

