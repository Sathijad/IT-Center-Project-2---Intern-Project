# Network Monitoring - Quick Reference

## ✅ Implementation Complete

Network monitoring with Wireshark/TShark is fully set up and ready to use.

---

## 🚀 Quick Start

```powershell
# 1. Install Wireshark from https://www.wireshark.org/download.html

# 2. Verify installation
tshark --version

# 3. Run tests with capture
npm run test:with-capture

# 4. Open capture in Wireshark
wireshark captures/api_capture_*.pcapng

# 5. Apply filters
# - Authorization headers: http.request.line contains "Authorization"
# - HTTP errors: http.response.code >= 400
# - TLS traffic: tls
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `docs/network-capture.md` | Complete setup and usage guide |
| `docs/WIRESHARK_FILTERS.md` | Comprehensive filter reference |
| `scripts/network-capture.js` | Automated capture script |
| `NETWORK_MONITORING_INSTRUCTIONS.md` | Step-by-step instructions |
| `NETWORK_MONITORING_SETUP.md` | Implementation summary |
| `captures/.gitkeep` | Directory for capture files |

---

## 📚 Documentation

**Start here:** [NETWORK_MONITORING_INSTRUCTIONS.md](./NETWORK_MONITORING_INSTRUCTIONS.md)

**Reference:**
- [Complete Guide](./docs/network-capture.md)
- [Filter Reference](./docs/WIRESHARK_FILTERS.md)
- [Setup Summary](./NETWORK_MONITORING_SETUP.md)

---

## 🎯 Common Tasks

### Capture During Tests
```powershell
npm run test:with-capture
```

### Custom Tests
```powershell
$env:TEST_COMMAND="cd mobile-app && flutter test"
npm run test:with-capture
```

### Manual Capture
```powershell
tshark -i 1 -f "tcp port 8080" -w captures/api.pcapng
```

### Analyze Captures
```powershell
wireshark captures/api_capture_*.pcapng
```

---

## 🔍 Quick Filters

| Purpose | Filter |
|---------|--------|
| Authorization headers | `http.request.line contains "Authorization"` |
| HTTP errors | `http.response.code >= 400` |
| TLS traffic | `tls` |
| Unencrypted traffic | `tcp.port == 8080 && !tls` |
| All HTTP | `http` |

---

## ⚠️ Requirements

- Wireshark installed (includes TShark)
- PowerShell as Administrator (Windows)
- Backend running on port 8080

---

**Ready to capture! See [NETWORK_MONITORING_INSTRUCTIONS.md](./NETWORK_MONITORING_INSTRUCTIONS.md) for details.**

