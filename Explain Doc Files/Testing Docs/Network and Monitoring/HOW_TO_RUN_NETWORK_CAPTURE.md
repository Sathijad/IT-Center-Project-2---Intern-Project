# How to Run Network Capture - Quick Guide

## ✅ Your Wireshark is Ready!

Wireshark 4.6.0 is installed and ready to use.

---

## 🚀 Quick Start

### Step 1: Run PowerShell as Administrator

**IMPORTANT:** Network capture requires administrator privileges on Windows.

1. Close current PowerShell
2. Right-click on PowerShell icon
3. Select **"Run as Administrator"**
4. Navigate to project: `cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2"`

### Step 2: Add Wireshark to PATH (One Time Setup)

```powershell
# Add Wireshark to PATH for this session
$env:PATH += ";C:\Program Files\Wireshark"

# Verify TShark works
tshark --version
```

**To make it permanent:**
1. Search for "Environment Variables" in Windows
2. Edit "Path" under User variables
3. Add: `C:\Program Files\Wireshark`
4. Click OK and restart PowerShell

### Step 3: Choose Network Interface

```powershell
# List available interfaces
tshark -D
```

You have **Loopback adapter** available (interface 10):
```
10. \Device\NPF_Loopback (Adapter for loopback traffic capture)
```

This is perfect for capturing `localhost:8080` traffic!

### Step 4: Start Backend

```powershell
# Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# Start backend (in another terminal)
cd auth-backend
.\start.bat
```

### Step 5: Run Tests with Capture

**Option A: Automatic Capture (Recommended)**

```powershell
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2"
$env:PATH += ";C:\Program Files\Wireshark"
npm run test:with-capture
```

**Option B: Manual Capture**

```powershell
# Terminal 1 - Start capture
$env:PATH += ";C:\Program Files\Wireshark"
tshark -i 10 -f "tcp port 8080" -w captures/api_traffic.pcapng

# Terminal 2 - Run tests
cd admin-web
npm run ui:test

# Go back to Terminal 1 and press Ctrl+C to stop capture
```

---

## 📊 Analyze Your Capture

### Open Capture File

```powershell
wireshark captures/api_capture_*.pcapng
```

### Quick Filters to Try

**1. Check Authorization Headers**
```
http.request.line contains "Authorization"
```

**2. Find HTTP Errors**
```
http.response.code >= 400
```

**3. View All HTTP Traffic**
```
http
```

**4. Check for Unencrypted Traffic**
```
tcp.port == 8080 && !tls
```

**5. Login Flow**
```
http.request.uri contains "/api/auth/login"
```

---

## 🎯 Example Workflow

### Complete Authentication Verification

```powershell
# Step 1: Prepare environment (run as Administrator)
$env:PATH += ";C:\Program Files\Wireshark"

# Step 2: Start capture
npm run test:with-capture

# Step 3: Wait for tests to complete

# Step 4: Open in Wireshark
cd captures
wireshark api_capture_*.pcapng

# Step 5: In Wireshark, apply filters:
# - Login requests: http.request.uri contains "/api/auth/login"
# - Authorization: http.request.line contains "Authorization"
# - Errors: http.response.code >= 400
```

---

## ⚠️ Troubleshooting

### "Permission Denied"

**Solution:** Run PowerShell as Administrator

### "TShark not found"

**Solution:** Add to PATH for session:
```powershell
$env:PATH += ";C:\Program Files\Wireshark"
```

Or add permanently to Windows PATH environment variable.

### "No packets captured"

**Check:**
1. Backend running on `localhost:8080`?
2. Tests actually sent requests?
3. Using correct interface (10 for loopback)?

**Test connection:**
```powershell
curl http://localhost:8080/api/health
```

### Empty Capture File

**If running as Administrator but still empty:**
- Try interface 6 (Wi-Fi) or 9 (Ethernet) instead of loopback
- Check if traffic is going through those adapters

---

## 📚 More Information

- **Detailed Guide:** [docs/network-capture.md](./docs/network-capture.md)
- **Filter Reference:** [docs/WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md)
- **Setup Summary:** [NETWORK_MONITORING_SETUP.md](./NETWORK_MONITORING_SETUP.md)

---

## 💡 Pro Tips

1. **Always run PowerShell as Administrator** for capture
2. **Use display filters** to find specific packets quickly
3. **Right-click packet → Follow → TCP Stream** to see complete request/response
4. **Save useful filters** in Wireshark: View → Display Filters → +
5. **Delete old captures** to save disk space

---

## ✅ Verification Checklist

- [ ] Wireshark installed (v4.6.0 confirmed ✅)
- [ ] PowerShell running as Administrator
- [ ] PATH includes Wireshark
- [ ] Interface 10 (Loopback) available
- [ ] Backend running on port 8080
- [ ] Can run `tshark --version` successfully

---

**You're all set! Start capturing network traffic now! 🕵️**

