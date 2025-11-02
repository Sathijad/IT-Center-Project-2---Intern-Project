# Network Monitoring Setup Instructions

## ✅ Complete Implementation

Network monitoring with Wireshark/TShark has been successfully set up for your IT Center Project.

---

## 📁 What Was Created

### 1. Documentation

- **`docs/network-capture.md`** - Complete Wireshark/TShark guide
  - Installation instructions
  - Manual and automated capture
  - Analysis workflows
  - Troubleshooting

- **`docs/WIRESHARK_FILTERS.md`** - Comprehensive filter reference
  - HTTP filters
  - Authorization & security filters
  - API endpoint filters
  - Error detection
  - Performance analysis
  - Combined filters

- **`NETWORK_MONITORING_INSTRUCTIONS.md`** - Quick start guide
  - Step-by-step setup
  - Common workflows
  - Troubleshooting tips

### 2. Scripts

- **`scripts/network-capture.js`** - Node.js automation script
  - Starts TShark before tests
  - Runs your test suite
  - Stops TShark automatically
  - Saves timestamped captures
  - Windows platform support

### 3. Package Scripts

Added to root `package.json`:
```json
"test:with-capture": "node scripts/network-capture.js"
"test:capture": "node scripts/network-capture.js --test-command \"cd admin-web && npm run ui:test\""
```

### 4. Directories

- **`captures/`** - Storage directory for capture files
  - `.gitkeep` to track directory in git
  - Added to `.gitignore` to exclude `.pcapng` files

### 5. Updated README

- Added "Network Monitoring" section to README.md
- Quick start commands
- Links to documentation

---

## 🚀 How to Use

### Quick Start

**1. Install Wireshark**
```powershell
# Download from https://www.wireshark.org/download.html
# Run installer, enable Npcap
```

**2. Verify Installation**
```powershell
tshark --version
tshark -D  # List interfaces
```

**3. Run Tests with Capture**
```powershell
# From project root
npm run test:with-capture
```

**4. Analyze Captures**
```powershell
# Open in Wireshark
wireshark captures/api_capture_YYYYMMDD_HHMMSS.pcapng

# Apply filters
# - Authorization: http.request.line contains "Authorization"
# - Errors: http.response.code >= 400
# - TLS: tls
```

---

## 📋 Required Setup Steps

### Prerequisites

1. ✅ Install Wireshark (includes TShark)
2. ✅ Verify TShark is in PATH
3. ✅ Run PowerShell as Administrator (Windows)
4. ✅ Identify network interface number

### Configuration

**Option 1: Use Default Interface**
- Script uses interface `1` by default
- Adjust if needed with `--interface` flag

**Option 2: Find Correct Interface**
```powershell
tshark -D
```

Output example:
```
1. \Device\NPF_{...}  (Ethernet)
2. \Device\NPF_{...}  (Wi-Fi)
```

Update script or use `--interface 2` if needed.

---

## 🎯 Use Cases

### 1. Verify JWT Authorization

**Capture during tests:**
```powershell
npm run test:with-capture
```

**Analyze:**
```powershell
# Open in Wireshark
wireshark captures/api_capture_*.pcapng

# Apply filter
http.request.line contains "Authorization"
```

**Verify:**
- ✅ Bearer token present in requests
- ✅ Token format correct
- ✅ No missing Authorization headers

### 2. Debug Authentication Failures

**Filter for 401 errors:**
```
http.response.code == 401
```

**Check:**
- Request sent Authorization header?
- Token expired?
- Wrong format?

### 3. Security Audit

**Check for unencrypted traffic:**
```
tcp.port == 8080 && !tls
```

**No results = Good (all traffic encrypted)**
**Results found = Security issue**

### 4. Analyze API Performance

**Steps:**
1. Open capture in Wireshark
2. Statistics → Conversations → TCP
3. Sort by Duration
4. Identify slow endpoints

---

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Permission denied | Run PowerShell as Administrator |
| TShark not found | Install Wireshark, add to PATH |
| Empty capture | Verify backend running on port 8080 |
| Wrong interface | Run `tshark -D`, use `--interface` |
| Localhost not captured | Enable Loopback capture in Npcap |

### Detailed Solutions

See [docs/network-capture.md](./docs/network-capture.md#troubleshooting) for comprehensive troubleshooting.

---

## 📊 Example Workflow

### Complete Authentication Flow Verification

```powershell
# 1. Start infrastructure
docker compose -f infra/docker-compose.yml up -d

# 2. Start backend
cd auth-backend
.\start.bat

# 3. Run tests with capture (in new terminal)
cd ..
npm run test:with-capture

# 4. Open capture
cd captures
wireshark api_capture_20250130_143022.pcapng

# 5. Apply filters sequentially
http.request.uri contains "/api/auth/login"
http.response.code == 200
http.request.header.authorization
http.request.uri contains "/api/auth/login-audit"
http.response.code >= 400
```

---

## 📚 Documentation Links

| Document | Purpose |
|----------|---------|
| [NETWORK_MONITORING_INSTRUCTIONS.md](./NETWORK_MONITORING_INSTRUCTIONS.md) | Quick start guide |
| [docs/network-capture.md](./docs/network-capture.md) | Complete guide |
| [docs/WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md) | Filter reference |
| [README.md](./README.md) | Project overview |

---

## ⚙️ Advanced Configuration

### Custom Test Commands

```powershell
# Set via environment variable
$env:TEST_COMMAND="cd mobile-app && flutter test"
npm run test:with-capture
```

### Custom Interface

```powershell
node scripts/network-capture.js --interface 2
```

### Manual Capture

```powershell
# Start capture
tshark -i 1 -f "tcp port 8080" -w captures/manual_capture.pcapng

# Run tests manually in another terminal

# Stop capture: Ctrl+C
```

---

## ✅ Verification Checklist

- [ ] Wireshark installed and verified (`tshark --version`)
- [ ] Network interface identified (`tshark -D`)
- [ ] Captures directory exists
- [ ] Tested help command (`node scripts/network-capture.js --help`)
- [ ] Can open Wireshark GUI
- [ ] Familiar with basic display filters

---

## 🎓 Next Steps

1. **Read the quick start:** [NETWORK_MONITORING_INSTRUCTIONS.md](./NETWORK_MONITORING_INSTRUCTIONS.md)
2. **Try a test run:** `npm run test:with-capture`
3. **Open the capture:** Review in Wireshark
4. **Apply filters:** Try examples from [WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md)
5. **Practice:** Run different test scenarios

---

## 💡 Tips

- Start with simple filters like `http` or `http.response.code >= 400`
- Use "Follow TCP Stream" to see complete request/response
- Save useful filters in Wireshark (View → Display Filters)
- Archive important captures for regression testing
- Don't commit capture files (already in .gitignore)

---

## 🆘 Support

**Problems?**

1. Check [Troubleshooting](#-troubleshooting) section above
2. Review [docs/network-capture.md](./docs/network-capture.md) troubleshooting section
3. Consult [WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md) for analysis help

**Questions?**

- Wireshark documentation: https://www.wireshark.org/docs/
- Display filters: https://wiki.wireshark.org/DisplayFilters
- Stack Overflow: Tag `wireshark` or `tshark`

---

**Setup Complete! Ready to capture network traffic. 🕵️**

