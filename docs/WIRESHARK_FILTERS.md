# Wireshark Display Filters Reference

Complete reference guide for analyzing API traffic captures in Wireshark.

## Table of Contents

1. [Basic HTTP Filters](#basic-http-filters)
2. [Authorization & Security](#authorization--security)
3. [API Endpoints](#api-endpoints)
4. [Error Detection](#error-detection)
5. [TLS/Security](#tlssecurity)
6. [Performance Analysis](#performance-analysis)
7. [Authentication Flow Analysis](#authentication-flow-analysis)
8. [Combined Filters](#combined-filters)

---

## Basic HTTP Filters

### General HTTP

| Filter | Description |
|--------|-------------|
| `http` | All HTTP traffic |
| `http.request` | HTTP requests only |
| `http.response` | HTTP responses only |
| `http.host` | Filter by host header |

### HTTP Methods

| Filter | Description |
|--------|-------------|
| `http.request.method == "GET"` | GET requests |
| `http.request.method == "POST"` | POST requests |
| `http.request.method == "PUT"` | PUT requests |
| `http.request.method == "DELETE"` | DELETE requests |
| `http.request.method == "PATCH"` | PATCH requests |

### Common Request Filters

```
# All POST requests
http.request.method == "POST"

# POST requests with JSON payload
http.request.method == "POST" && http.content_type contains "application/json"

# Requests to specific path
http.request.uri contains "/api/auth/login"
```

---

## Authorization & Security

### JWT Token Verification

```
# Requests with Authorization header
http.request.header.authorization

# Bearer token present
http.request.header.authorization contains "Bearer"

# Specific token value (replace XXXX with your token prefix)
http.request.header.authorization contains "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9"
```

### Authorization Header Analysis

```
# Full Authorization header in details pane
http.request.header.authorization

# Long tokens (potential issue)
http.request.header.authorization.len > 5000

# Missing Authorization header
!http.request.header.authorization
```

### OAuth/OIDC Flows

```
# OAuth authorization code
http.request.uri contains "code="

# Token exchange requests
http.request.uri contains "/oauth2/token" || http.request.uri contains "/token"

# OIDC discovery
http.request.uri contains "/.well-known/openid-configuration"
```

---

## API Endpoints

### Authentication Endpoints

```
# Login requests
http.request.uri contains "/api/auth/login"

# Logout requests
http.request.uri contains "/api/auth/logout"

# Token validation
http.request.uri contains "/api/auth/validate"

# Refresh token
http.request.uri contains "/api/auth/refresh"
```

### User Management Endpoints

```
# Get user profile
http.request.uri contains "/api/users/me" && http.request.method == "GET"

# Update profile
http.request.uri contains "/api/users/me" && http.request.method == "PUT"

# User list (admin)
http.request.uri contains "/api/users"
```

### Role Management Endpoints

```
# Assign role
http.request.uri contains "/api/users/" && http.request.uri contains "/roles"

# Get roles
http.request.uri contains "/api/roles"
```

### Audit Endpoints

```
# Login audit events
http.request.uri contains "/api/auth/login-audit"

# Audit log queries
http.request.uri contains "/api/audit"
```

### Health Checks

```
# Health check
http.request.uri contains "/actuator/health"

# Backend health
http.request.uri contains "/health"
```

---

## Error Detection

### HTTP Status Codes

```
# Client errors (4xx)
http.response.code >= 400 && http.response.code < 500

# Server errors (5xx)
http.response.code >= 500 && http.response.code < 600

# Specific error codes
http.response.code == 401    # Unauthorized
http.response.code == 403    # Forbidden
http.response.code == 404    # Not Found
http.response.code == 500    # Internal Server Error
http.response.code == 502    # Bad Gateway
http.response.code == 503    # Service Unavailable
```

### Authentication Failures

```
# Unauthorized errors
http.response.code == 401

# 401 with Authorization header (invalid token)
http.response.code == 401 && http.request.header.authorization

# Forbidden errors (role issue)
http.response.code == 403
```

### Network Errors

```
# TCP errors
tcp.analysis.flags && !tcp.flags.syn

# Retransmissions
tcp.analysis.retransmission

# Duplicate ACKs
tcp.analysis.duplicate_ack

# Zero window (receiver can't accept data)
tcp.analysis.zero_window
```

---

## TLS/Security

### TLS Detection

```
# All TLS traffic
tls

# TLS handshake
tls.handshake.type == 1

# TLS version
tls.version == "TLS 1.2"
tls.version == "TLS 1.3"

# Unencrypted HTTP on port 8080 (security concern)
tcp.port == 8080 && !tls
```

### Certificate Analysis

```
# Certificate present
tls.handshake.certificate

# Certificate valid
tls.handshake.extensions_server_name
```

### Security Warnings

```
# Self-signed certificates
tls.handshake.certificate.self_signed

# Expired certificates
tls.handshake.certificate.expired
```

---

## Performance Analysis

### Request Duration

```
# Get conversation statistics
# Use: Statistics → Conversations → TCP
# Look for "Duration" column

# Long-running requests (show only TCP)
tcp and (ip.src == <local-ip> or ip.dst == <local-ip>)
```

### Payload Size

```
# Large request bodies
http.request.content_length > 10000

# Large responses
http.response.content_length > 100000

# JSON payloads
http.content_type contains "application/json"
```

### Timing Analysis

```
# Requests with long time to first byte
# Use: Statistics → IO Graphs
# Time column in packet list shows relative timing
```

---

## Authentication Flow Analysis

### Complete Login Flow

Use these filters in sequence to verify the login process:

**Step 1: Login Request**
```
http.request.uri contains "/api/auth/login" && http.request.method == "POST"
```

**Step 2: Login Response with Token**
```
http.response.uri contains "/api/auth/login" && http.response.code == 200
```

**Step 3: Validate Token**
```
http.request.header.authorization contains "Bearer" && frame.number > <login-frame-number>
```

**Step 4: Audit Log Entry**
```
http.request.uri contains "/api/auth/login-audit" && http.request.method == "POST"
```

### Token Refresh Flow

```
# Refresh token request
http.request.uri contains "/api/auth/refresh"

# New token received
http.response.uri contains "/api/auth/refresh" && http.response.code == 200
```

### Session Management

```
# Session cookies
http.cookie

# Authorization header consistency
http.request.header.authorization && http.request.uri contains "/api/"
```

---

## Combined Filters

### Complete Authentication Verification

```
# All API requests with Authorization header
http.request.method in {"POST" "PUT" "DELETE"} && 
http.request.uri contains "/api/" && 
http.request.header.authorization
```

### Failed API Calls with Details

```
http.response.code >= 400 && 
http.host == "localhost:8080" && 
http.response.content_length > 0
```

### All Traffic to Backend

```
(ip.dst == 127.0.0.1 && tcp.dstport == 8080) || 
(http.host == "localhost:8080") ||
(http.host contains "127.0.0.1:8080")
```

### Security Audit Checklist

```
# 1. All requests have Authorization header
http.request.uri contains "/api/" && !http.request.header.authorization

# 2. No exposed tokens in responses
http.response.header.authorization

# 3. No passwords in URLs
http.request.uri contains "password="

# 4. No credentials in request bodies
http.request.method == "POST" && http.file_data contains "password"
```

### Mobile App API Calls

```
# All mobile requests (if using specific header)
http.request.header.user_agent contains "flutter"

# Or by custom header
http.request.header.x_client_type
```

---

## Practical Examples

### Example 1: Verify Authorization Headers

**Goal:** Ensure all API requests include JWT tokens

**Filter:**
```
http.request.uri contains "/api/" && 
http.request.method in {"POST" "PUT" "DELETE"} && 
!http.request.header.authorization
```

**Result:** If this returns packets, those requests are missing authorization (security issue)

### Example 2: Debug 401 Errors

**Goal:** Find why authentication is failing

**Filter:**
```
http.response.code == 401
```

**Analysis:**
1. Look at the response body for error message
2. Check if Authorization header was sent in request
3. Verify token format in request
4. Check if token has expired (inspect JWT)

### Example 3: Analyze Login Flow

**Goal:** Trace complete login process

**Steps:**
1. Find login request: `http.request.uri contains "/api/auth/login"`
2. Note frame number
3. Check response: `http.response.uri contains "/api/auth/login"`
4. Follow up requests with token
5. Verify audit log entry

### Example 4: Find Slow Requests

**Goal:** Identify performance bottlenecks

**Steps:**
1. Open Statistics → Conversations
2. Select TCP tab
3. Sort by Duration column
4. Investigate long-duration conversations

### Example 5: Security Scan

**Goal:** Verify no sensitive data leaks

**Filters to check:**
```
# Passwords in requests
http.request.uri contains "password"
http.file_data contains "password"

# Tokens in responses
http.response.header.authorization

# Unencrypted traffic
tcp.port == 8080 && !tls
```

---

## Pro Tips

### 1. Save Common Filters

In Wireshark:
- View → Display Filters
- Click "+" to add your own filter
- Give it a descriptive name

### 2. Follow TCP Stream

- Right-click packet → Follow → TCP Stream
- See complete request/response exchange
- Useful for debugging complex API calls

### 3. Export Objects

- File → Export Objects → HTTP
- Save response bodies for analysis
- Useful for inspecting large JSON responses

### 4. Time Display Options

- View → Time Display Format
- Use "Seconds Since Beginning of Capture" for relative timing
- Use "UTC Date and Time" for absolute timestamps

### 5. Packet Coloring Rules

- View → Coloring Rules
- Create rules for common scenarios:
  - Green: Successful API calls (200-299)
  - Red: Error responses (400-599)
  - Yellow: Authorization-related packets

---

## Quick Reference Card

Print this for quick access:

```
BASIC:
  http                                    All HTTP traffic
  http.request                           HTTP requests
  http.response.code >= 400              Errors
  http.request.uri contains "/api/"      API calls

AUTHORIZATION:
  http.request.header.authorization      Auth header present
  http.response.code == 401              Unauthorized
  http.response.code == 403              Forbidden

PERFORMANCE:
  tcp.analysis.retransmission            Retransmissions
  tcp.analysis.zero_window               Receiver overloaded

SECURITY:
  tcp.port == 8080 && !tls               Unencrypted traffic
  http.request.uri contains "password"   Password exposure
```

---

## Related Documentation

- [network-capture.md](./network-capture.md) - How to capture traffic
- [SECURITY_SCAN_ZAP.md](./SECURITY_SCAN_ZAP.md) - Application security scanning
- [auth.yaml](./openapi/auth.yaml) - API specification

---

## Additional Resources

- [Wireshark Display Filters](https://wiki.wireshark.org/DisplayFilters)
- [Wireshark Filter Reference](https://www.wireshark.org/docs/dfref/)
- [HTTP Protocol Reference](https://www.wireshark.org/docs/dfref/h/http.html)

