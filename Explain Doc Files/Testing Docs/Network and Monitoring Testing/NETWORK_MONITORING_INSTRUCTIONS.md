# Network Monitoring Instructions

## 📋 Quick Setup Guide

Follow these steps to set up network monitoring with Wireshark/TShark for your IT Center Project.

---

## Step 1: Install Wireshark

### Windows

1. **Download Wireshark:**
   - Go to [wireshark.org/download.html](https://www.wireshark.org/download.html)
   - Download Windows Installer (64-bit)
   - Run the installer

2. **Installation Options:**
   - ✅ Select "Wireshark" (includes TShark command-line tool)
   - ✅ Select "Npcap" (required for Windows packet capture)
   - ✅ Optional: Enable "Loopback capture support" for localhost traffic

3. **Verify Installation:**
   ```powershell
   tshark --version
   ```

   You should see output like:
   ```
   TShark (Wireshark) 4.2.0
   ```

### macOS/Linux

```bash
# macOS
brew install wireshark

# Ubuntu/Debian
sudo apt-get install wireshark tshark

# Verify
tshark --version
```

---

## Step 2: Prepare Your Environment

### Create Captures Directory

The script will create this automatically, but you can create it manually:

```powershell
mkdir captures
```

### Check Network Interfaces

```powershell
# List available interfaces
tshark -D
```

You'll see output like:
```
1. \Device\NPF_{...}  (Ethernet)
2. \Device\NPF_{...}  (Wi-Fi)
...
```

**Note the interface number** you want to use (usually `1` for Ethernet/Wi-Fi).

---

## Step 3: Run Tests with Capture

### Option A: Automatic (Recommended)

**Run E2E tests with automatic capture:**

```powershell
# From project root directory
npm run test:with-capture
```

This will:
1. ✅ Start TShark capture
2. ✅ Run admin-web UI tests
3. ✅ Stop capture automatically
4. ✅ Save capture file with timestamp

### Option B: Custom Test Command

**Run your own tests with capture:**

```powershell
# Set test command
$env:TEST_COMMAND="cd admin-web && npm test"

# Run with capture
npm run test:with-capture
```

**Mobile app tests:**
```powershell
$env:TEST_COMMAND="cd mobile-app && flutter test"
npm run test:with-capture
```

### Option C: Manual Capture

**Start capture manually:**

```powershell
# Start TShark
tshark -i 1 -f "tcp port 8080" -w captures/api_traffic.pcapng
```

**Run your tests in another terminal:**
```powershell
cd admin-web
npm run ui:test
```

**Stop capture:**
Press `Ctrl+C` in the TShark terminal

---

## Step 4: Analyze Captures

### Open Capture File

```powershell
# Open the most recent capture
cd captures
wireshark api_capture_YYYYMMDD_HHMMSS.pcapng
```

### Quick Analysis Tips

**1. Check Authorization Headers**

In Wireshark display filter box:
```
http.request.line contains "Authorization"
```

This shows all requests with Authorization headers. Verify Bearer tokens are present.

**2. Find HTTP Errors**

```
http.response.code >= 400
```

This highlights failed requests. Check response bodies for error messages.

**3. Verify TLS/HTTPS**

```
tls && http.host == "localhost:8080"
```

If this returns no results, you have unencrypted HTTP traffic (potential security issue).

**4. Trace Login Flow**

```
http.request.uri contains "/api/auth/login"
```

Right-click → Follow → TCP Stream to see complete request/response.

---

## Step 5: Troubleshooting

### "Permission Denied" Error

**Cause:** TShark needs administrator privileges on Windows.

**Solution:** Run PowerShell as Administrator.

### "No Interfaces Found"

**Cause:** Wireshark not installed or Npcap missing.

**Solution:** 
```powershell
# Reinstall Npcap
# Download from: https://npcap.com/dist/
# Enable "Loopback capture support"
```

### "tshark: command not found"

**Cause:** TShark not in PATH.

**Solution (Windows):**
```powershell
# Add Wireshark to PATH
$env:PATH += ";C:\Program Files\Wireshark"
```

Or find tshark.exe and add its directory to Windows PATH environment variable.

### Empty Capture File

**Possible causes:**
1. Backend not running on port 8080
2. Wrong network interface
3. No traffic during capture

**Solution:**
```powershell
# Verify backend is running
curl http://localhost:8080/api/health

# Test if TShark can see traffic
tshark -i 1 -f "tcp port 8080" -c 10
```

---

## 📚 Additional Resources

### Documentation

- **Complete Guide:** [docs/network-capture.md](./docs/network-capture.md)
- **Filter Reference:** [docs/WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md)
- **Security Scanning:** [docs/SECURITY_SCAN_ZAP.md](./docs/SECURITY_SCAN_ZAP.md)

### Common Use Cases

**Verify JWT Tokens:**
```
http.request.header.authorization contains "Bearer"
```

**Debug Authentication Failures:**
```
http.response.code == 401
```

**Find Slow Requests:**
- Statistics → Conversations → TCP
- Sort by Duration column

**Security Audit:**
- Check for unencrypted traffic: `tcp.port == 8080 && !tls`
- Verify no passwords in URLs: `http.request.uri contains "password"`

---

## 🎯 Example Workflow

**Complete authentication flow verification:**

```powershell
# 1. Start capture
npm run test:with-capture

# 2. Tests run automatically, capture saved

# 3. Open capture in Wireshark
cd captures
wireshark api_capture_20250130_143022.pcapng

# 4. Apply filter for login requests
http.request.uri contains "/api/auth/login"

# 5. Verify login response (200 OK)
# Click on response packet → Inspect

# 6. Check subsequent requests have Authorization header
http.request.header.authorization && http.request.uri contains "/api/users"

# 7. Verify audit log was created
http.request.uri contains "/api/auth/login-audit"

# 8. Check for any errors
http.response.code >= 400
```

---

## ⚠️ Important Notes

### Windows-Specific

1. **Run PowerShell as Administrator** for TShark to work
2. **Enable Loopback Capture** in Npcap for localhost traffic
3. **Use Interface Name** if number doesn't work: `tshark -i "\Device\NPF_{...}"`

### Best Practices

1. ✅ Use capture filters to reduce file size
2. ✅ Stop capture promptly after tests
3. ✅ Archive important captures for regression testing
4. ✅ Use display filters for analysis
5. ✅ Delete old captures to save disk space

---

## 🆘 Support

If you encounter issues:

1. Check [Troubleshooting](#step-5-troubleshooting) section
2. Review [network-capture.md](./docs/network-capture.md) for detailed explanations
3. Consult [WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md) for analysis help

---

**Happy Capturing! 🕵️**

