# 🔍 Network Monitoring - Start Here

## Welcome! 

You installed Wireshark, and now you want to know **what to do with it**.

This guide will explain everything!

---

## 📖 Read These in Order

### 1. ⭐ **WHAT_TO_DO_WITH_WIRESHARK.md**

**Purpose:** Learn WHY you need Wireshark and WHAT you can do with it

**Read this FIRST** - It explains:
- What Wireshark shows you
- Common tasks you'll do
- Real examples
- How filters work

👉 **Open:** [WHAT_TO_DO_WITH_WIRESHARK.md](./WHAT_TO_DO_WITH_WIRESHARK.md)

---

### 2. 🚀 **HOW_TO_RUN_NETWORK_CAPTURE.md**

**Purpose:** Learn HOW to actually use Wireshark

**Read this SECOND** - It shows you:
- Step-by-step instructions
- Commands to run
- How to open captures
- Troubleshooting

👉 **Open:** [HOW_TO_RUN_NETWORK_CAPTURE.md](./HOW_TO_RUN_NETWORK_CAPTURE.md)

---

### 3. 📚 **docs/WIRESHARK_FILTERS.md**

**Purpose:** Reference guide for all filters

**Read when needed** - Lists all available filters

👉 **Open:** [docs/WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md)

---

## 🎯 Quick Summary

### What Wireshark Does

**Wireshark = Network Traffic Detective 🕵️**

It captures and shows you **all network traffic** between:
- Your test client (browser/app)
- Your backend API (localhost:8080)

### What You Can See

✅ **HTTP Requests** - What your app sends to the API  
✅ **HTTP Responses** - What the API sends back  
✅ **Headers** - Including Authorization tokens  
✅ **Error Codes** - 401, 403, 500, etc.  
✅ **Timing** - How fast API responds  
✅ **Security** - Encrypted or unencrypted traffic  

### Common Tasks

1. **Check if JWT tokens are sent** in requests
2. **Debug why login fails**
3. **Find which API calls error**
4. **Verify traffic is encrypted** (security)
5. **See complete request/response** data

---

## 🚀 Quick Start (30 seconds)

```powershell
# 1. Run PowerShell as Administrator
# 2. Run these commands:

cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2"
$env:PATH += ";C:\Program Files\Wireshark"
npm run test:with-capture

# 3. Wait for tests to complete
# 4. Open the capture:
wireshark captures/api_capture_*.pcapng

# 5. In Wireshark, try these filters:
#    - http (all HTTP traffic)
#    - http.response.code >= 400 (errors)
#    - http.request.line contains "Authorization" (check tokens)
```

---

## 📁 Complete Documentation

| File | Purpose |
|------|---------|
| **START_HERE_NETWORK_MONITORING.md** | ⭐ This file - overview |
| **WHAT_TO_DO_WITH_WIRESHARK.md** | What Wireshark does and why you need it |
| **HOW_TO_RUN_NETWORK_CAPTURE.md** | Step-by-step how to use it |
| **docs/network-capture.md** | Complete technical guide |
| **docs/WIRESHARK_FILTERS.md** | All available filters |
| **NETWORK_MONITORING_SETUP.md** | Implementation details |
| **NETWORK_CAPTURE_READY.md** | Quick verification |

---

## 🎓 Learning Path

```
Step 1: Read WHAT_TO_DO_WITH_WIRESHARK.md
        ↓ (Understand what you can do)
Step 2: Read HOW_TO_RUN_NETWORK_CAPTURE.md  
        ↓ (Learn how to do it)
Step 3: Try running npm run test:with-capture
        ↓ (Get hands-on experience)
Step 4: Open capture in Wireshark
        ↓ (See the results)
Step 5: Try different filters
        ↓ (Explore capabilities)
Step 6: Use docs/WIRESHARK_FILTERS.md as reference
        ↓ (Become expert)
```

---

## 🆘 Need Help?

### "I don't understand what Wireshark does"

👉 Read: [WHAT_TO_DO_WITH_WIRESHARK.md](./WHAT_TO_DO_WITH_WIRESHARK.md)

### "I can't run the capture"

👉 Read: [HOW_TO_RUN_NETWORK_CAPTURE.md](./HOW_TO_RUN_NETWORK_CAPTURE.md) - Troubleshooting section

### "Which filter should I use?"

👉 Read: [docs/WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md) - Common Filters section

### "I want more details"

👉 Read: [docs/network-capture.md](./docs/network-capture.md) - Complete guide

---

## ✅ Checklist

Before you start:

- [ ] Wireshark installed (you have it! ✅)
- [ ] Read WHAT_TO_DO_WITH_WIRESHARK.md
- [ ] Read HOW_TO_RUN_NETWORK_CAPTURE.md
- [ ] Can run PowerShell as Administrator
- [ ] Backend running on port 8080

---

## 🎉 You're Ready!

**Start here:** [WHAT_TO_DO_WITH_WIRESHARK.md](./WHAT_TO_DO_WITH_WIRESHARK.md)

This will teach you everything you need to know about using Wireshark with your project.

**Good luck!** 🚀

