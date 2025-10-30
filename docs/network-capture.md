# Network Monitoring Guide (Wireshark/TShark)

This guide explains how to capture and analyze network traffic during local testing, focusing on API calls to the authentication backend.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Manual Capture](#manual-capture)
4. [Automated Capture During Tests](#automated-capture-during-tests)
5. [Analyzing Captures](#analyzing-captures)
6. [Common Use Cases](#common-use-cases)

---

## Overview

Network monitoring helps you:

- **Verify HTTPS/TLS**: Ensure traffic to `localhost:8080` is encrypted (or identify unencrypted endpoints)
- **Check Authorization Headers**: Confirm JWT tokens are being sent correctly in API requests
- **Debug API Issues**: Identify failed requests, timeouts, or malformed payloads
- **Security Validation**: Verify no sensitive data leaks in HTTP headers or responses
- **Performance Analysis**: Measure API response times and payload sizes

## Prerequisites

### 1. Install Wireshark

**Windows:**
1. Download from [wireshark.org](https://www.wireshark.org/download.html)
2. Install with default settings
3. Ensure TShark command-line tool is installed (included with Wireshark)

**Verify Installation:**
```powershell
# Check if tshark is available
tshark --version
```

### 2. Identify Network Interface

```powershell
# List available network interfaces
tshark -D
```

Common interface numbers:
- `1` = Ethernet/Wi-Fi adapter (for localhost traffic)
- `\Device\NPF_{GUID}` = Specific Windows adapter name

**Note:** For capturing `localhost` traffic on Windows, you may need to use **RawCap** or **Npcap** (loopback adapter). See [Windows-specific notes](#windows-localhost-capture) below.

---

## Manual Capture

### Basic Capture

```powershell
# Capture all traffic on port 8080 to a file
tshark -i 1 -f "tcp port 8080" -w captures/api_traffic.pcapng
```

**Parameters:**
- `-i 1` = Interface number (adjust based on `tshark -D` output)
- `-f "tcp port 8080"` = Capture filter (efficient, reduces file size)
- `-w captures/api_traffic.pcapng` = Output file path

### Start Capture

```powershell
# Create captures directory
mkdir captures

# Start capture in background
tshark -i 1 -f "tcp port 8080" -w captures/api_traffic.pcapng
```

### Stop Capture

Press `Ctrl+C` to stop the capture.

### View Captured File

Open in Wireshark GUI:
```powershell
# Open the capture file
wireshark captures/api_traffic.pcapng
```

---

## Automated Capture During Tests

We provide a Node.js script that automatically:
1. Starts TShark capture before tests
2. Runs your test suite
3. Stops TShark after tests complete
4. Saves the capture file with a timestamp

### Usage

#### Run with E2E Tests

```powershell
# From project root
npm run test:with-capture

# This will:
# 1. Start TShark capture
# 2. Run admin-web E2E tests
# 3. Stop TShark
# 4. Save capture to captures/ directory
```

#### Run with Custom Test Command

```powershell
# Set your test command via environment variable
$env:TEST_COMMAND="cd admin-web && npm run ui:test"
npm run test:with-capture
```

#### Run with Mobile Tests

```powershell
# Run Flutter tests with capture
$env:TEST_COMMAND="cd mobile-app && flutter test"
npm run test:with-capture
```

### Capture File Location

Captures are saved to:
```
captures/
  └── api_capture_YYYYMMDD_HHMMSS.pcapng
```

Example: `captures/api_capture_20250130_143022.pcapng`

---

## Analyzing Captures

### Open in Wireshark

```powershell
wireshark captures/api_capture_20250130_143022.pcapng
```

### Useful Display Filters

See [WIRESHARK_FILTERS.md](./WIRESHARK_FILTERS.md) for complete filter reference.

**Quick Filters:**

| Purpose | Display Filter |
|---------|----------------|
| Only HTTP requests | `http.request` |
| Failed HTTP requests | `http.response.code >= 400` |
| POST requests to `/api/auth/*` | `http.request.method == "POST" && http.request.uri contains "/api/auth/"` |
| Requests with Authorization header | `http.request.line contains "Authorization"` |
| Responses with error codes | `http.response.code == 401 or http.response.code == 403` |
| TLS traffic | `tls` |
| Traffic to specific host | `http.host == "localhost:8080"` |

### Example Analysis Workflow

1. **Open capture file:**
   ```
   wireshark captures/api_capture_20250130_143022.pcapng
   ```

2. **Apply display filter:**
   ```
   http.request.method == "POST" && http.request.uri contains "/api/auth/"
   ```

3. **View HTTP details:**
   - Select a packet
   - Expand "Hypertext Transfer Protocol" in packet details
   - Check "Full request URI" and "Request in frame"

4. **Check Authorization header:**
   - Apply filter: `http.request.line contains "Authorization"`
   - Verify Bearer token is present
   - Confirm token structure

5. **Identify errors:**
   - Apply filter: `http.response.code >= 400`
   - Check response bodies for error messages

---

## Common Use Cases

### 1. Verify JWT Authorization

**Display Filter:**
```
http.request.line contains "Authorization: Bearer"
```

**What to check:**
- Authorization header is present in all API requests
- Token format is correct: `Bearer <token>`
- Token length is reasonable (not suspiciously long)

### 2. Detect Unencrypted Traffic

**Display Filter:**
```
tcp.port == 8080 && !tls
```

If this returns results, you have unencrypted traffic to port 8080 (potential security issue).

**Filter for HTTPS:**
```
tls && http.host == "localhost:8080"
```

### 3. Find Failed API Calls

**Display Filter:**
```
http.response.code >= 400 && http.host == "localhost:8080"
```

**Analyze:**
- 401: Authentication failure (check token validity)
- 403: Authorization failure (check user roles)
- 500: Server error (check backend logs)

### 4. Measure API Latency

**Display Filter:**
```
http
```

**Analysis:**
1. Select Statistics → Conversations
2. Filter by TCP
3. View duration for each conversation
4. Identify slow endpoints

### 5. Audit Log Event Verification

**Capture Setup:**
1. Start capture
2. Perform login action in UI
3. Stop capture

**Analysis Filter:**
```
http.request.uri contains "/api/auth/login-audit"
```

Verify:
- POST request is made
- Request includes user ID and timestamp
- Response is 201 Created (success)

---

## Windows-Specific Notes

### Capturing Localhost Traffic

On Windows, capturing `localhost` traffic requires additional setup:

**Option 1: Use RawCap (Recommended)**

RawCap is a free tool that captures localhost loopback traffic:

```powershell
# Download RawCap from https://www.netresec.com/?page=RawCap
# Save rawcap.exe to C:\Tools\

# Start capture
C:\Tools\rawcap.exe 127.0.0.1 captures\localhost_capture.pcap

# Stop with Ctrl+C, then convert to pcapng for Wireshark
```

**Option 2: Use Loopback Adapter**

1. Install Npcap (installer included with Wireshark)
2. Enable loopback capture during installation
3. Use interface name `Loopback` in capture filters

**Option 3: Use Local Network IP**

Instead of `localhost`, use your machine's local IP:

```powershell
# Find your IP
ipconfig
# Example: 192.168.1.100

# Capture traffic to this IP
tshark -i 1 -f "host 192.168.1.100 and tcp port 8080" -w captures/api_traffic.pcapng
```

### PowerShell Permissions

TShark requires administrator privileges to capture traffic:

**Run PowerShell as Administrator:**
1. Right-click PowerShell icon
2. Select "Run as Administrator"
3. Navigate to project directory
4. Run capture commands

---

## Troubleshooting

### "Permission Denied" Error

**Solution:** Run PowerShell as Administrator

### "No Interfaces Found"

**Solution:** Run `tshark -D` to list available interfaces, update script with correct interface number

### "Access Denied" for Interface

**Solution:** Run TShark with administrator privileges

### Empty Capture File

**Possible causes:**
1. No traffic on port 8080 during capture
2. Wrong network interface selected
3. Backend not running on port 8080

**Solution:**
```powershell
# Test if backend is running
curl http://localhost:8080/api/health

# Verify TShark can see traffic
tshark -i 1 -f "tcp port 8080" -c 10
```

---

## Best Practices

1. **Use capture filters** (`-f`) to reduce file size and improve performance
2. **Stop captures promptly** after tests to avoid huge files
3. **Archive captures** for important test runs (regression analysis)
4. **Use display filters** for analysis instead of capturing everything
5. **Rotate capture files** to prevent disk space issues

---

## Related Documentation

- [WIRESHARK_FILTERS.md](./WIRESHARK_FILTERS.md) - Complete list of display filters
- [SECURITY_SCAN_ZAP.md](./SECURITY_SCAN_ZAP.md) - Application security scanning
- [auth-backend/backend docs/testing/](./auth-backend/backend%20docs/testing/) - Backend testing guide

