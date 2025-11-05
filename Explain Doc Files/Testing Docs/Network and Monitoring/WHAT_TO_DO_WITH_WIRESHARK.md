# What to Do With Wireshark - Simple Guide

## 🎯 Why Use Wireshark?

Wireshark captures and shows you **all network traffic** going to and from your backend API at `localhost:8080`.

Think of it like a **security camera for your network** - you can see everything that happens!

---

## 🔍 What You Can See

### 1. **Check if Authorization Headers Are Sent**

**Problem:** Is your JWT token being sent in API requests?

**Solution with Wireshark:**
1. Capture during tests
2. Open Wireshark
3. Filter: `http.request.line contains "Authorization"`
4. ✅ See all requests with tokens
5. ❌ If no results = Authorization not sent (security issue!)

---

### 2. **Debug Authentication Failures**

**Problem:** Why is login failing? Is it a token issue?

**Solution with Wireshark:**
1. Capture during login test
2. Open Wireshark
3. Filter: `http.request.uri contains "/api/auth/login"`
4. Right-click the packet → Follow → TCP Stream
5. See **complete request** and **complete response**
6. Check if token is valid, expired, or malformed

---

### 3. **Find HTTP Errors**

**Problem:** Which API calls are failing?

**Solution with Wireshark:**
1. Capture during tests
2. Open Wireshark
3. Filter: `http.response.code >= 400`
4. See all failed requests
5. Check error messages in response body

---

### 4. **Security Check - Unencrypted Traffic**

**Problem:** Is any traffic unencrypted (security risk)?

**Solution with Wireshark:**
1. Capture during tests
2. Open Wireshark
3. Filter: `tcp.port == 8080 && !tls`
4. ❌ If results found = unencrypted HTTP (security issue!)
5. ✅ If no results = all traffic is encrypted

---

### 5. **Performance Analysis**

**Problem:** Which API calls are slow?

**Solution with Wireshark:**
1. Capture during tests
2. Open Wireshark
3. Go to Statistics → Conversations → TCP
4. Sort by Duration
5. Identify slow endpoints

---

## 🚀 Simple 3-Step Process

### Step 1: Capture Traffic

```powershell
# Run PowerShell as Administrator
cd "C:\Users\SathijaDeshapriya\Downloads\IT Center Project 2"
$env:PATH += ";C:\Program Files\Wireshark"

# Run tests with automatic capture
npm run test:with-capture
```

This creates a file: `captures/api_capture_20250130_143022.pcapng`

---

### Step 2: Open in Wireshark

```powershell
# Open the capture file
wireshark captures/api_capture_*.pcapng
```

Wireshark opens with your captured traffic!

---

### Step 3: Analyze

Type filters in the **display filter box** at the top:

| What You Want | Type This Filter |
|---------------|------------------|
| See all HTTP | `http` |
| Find errors | `http.response.code >= 400` |
| Check authorization | `http.request.line contains "Authorization"` |
| Login requests | `http.request.uri contains "/api/auth/login"` |
| Post requests | `http.request.method == "POST"` |

Press **Enter** to apply filter!

---

## 📊 What You'll See in Wireshark

### Main Window Layout

```
┌────────────────────────────────────────────────────────────┐
│ Wireshark - Captured Traffic                               │
├────────────────────────────────────────────────────────────┤
│ Display Filter: [http                       ] [Apply]     │
├────────────────────────────────────────────────────────────┤
│ No.  Time     Source       Destination  Protocol  Info     │
├────────────────────────────────────────────────────────────┤
│ 1    0.000    127.0.0.1    127.0.0.1    HTTP     POST     │
│ 2    0.123    127.0.0.1    127.0.0.1    HTTP     HTTP/200 │
│ 3    0.456    127.0.0.1    127.0.0.1    HTTP     POST     │
└────────────────────────────────────────────────────────────┘
```

### Details Panel (when you click a packet)

Shows:
- **Request URL**
- **HTTP headers** (including Authorization)
- **Request body** (data sent)
- **Response body** (data received)
- **Status code** (200, 401, 500, etc.)

---

## 🎓 Real Examples

### Example 1: Verify Login Works Correctly

**Goal:** Make sure login sends correct data and gets valid token

1. Run: `npm run test:with-capture` (during login test)
2. Open Wireshark
3. Filter: `http.request.uri contains "/api/auth/login"`
4. Click on the packet
5. In details, expand "Hypertext Transfer Protocol"
6. Check:
   - ✅ Request body has correct username/password
   - ✅ Response is 200 OK
   - ✅ Response contains token

---

### Example 2: Find Why API Call Fails

**Goal:** Debug a failed API request

1. Run: `npm run test:with-capture`
2. Open Wireshark
3. Filter: `http.response.code >= 400`
4. Click on failed request
5. Right-click → Follow → TCP Stream
6. See complete error message
7. Check if it's authentication (401), authorization (403), or server error (500)

---

### Example 3: Security Audit

**Goal:** Verify all traffic is encrypted

1. Run: `npm run test:with-capture`
2. Open Wireshark
3. Filter: `tcp.port == 8080 && !tls`
4. Check result:
   - ✅ **Empty results** = All traffic encrypted (good!)
   - ❌ **Has results** = Unencrypted HTTP found (security issue!)

---

## 💡 Most Common Tasks

### Task 1: "Did my test send API requests?"

1. Open Wireshark
2. Filter: `http`
3. Count the number of HTTP packets
4. If zero = no requests were sent

---

### Task 2: "Is my token being sent?"

1. Open Wireshark
2. Filter: `http.request.line contains "Authorization"`
3. If results appear = token is sent ✅
4. If no results = token not sent ❌

---

### Task 3: "Which requests failed?"

1. Open Wireshark
2. Filter: `http.response.code >= 400`
3. See all failed requests
4. Click each to see error message

---

## 🛠️ Wireshark Features You'll Use

### 1. Display Filter Box

**Location:** Top of Wireshark window

**Purpose:** Filter packets to find what you need

**Examples:**
- `http` - All HTTP traffic
- `http.response.code == 401` - Only 401 errors
- `http.request.method == "POST"` - Only POST requests

---

### 2. Follow TCP Stream

**How to use:**
1. Right-click on any packet
2. Select "Follow" → "TCP Stream"
3. See complete request and response

**Purpose:** See the full conversation between client and server

---

### 3. Statistics Menu

**Location:** Statistics (menu bar)

**Useful options:**
- **Conversations** → **TCP** - See which endpoints talked
- **IO Graphs** - Visualize traffic over time
- **Protocol Hierarchy** - See what protocols were used

---

## 🎯 Quick Reference Card

```
TO CAPTURE:
  npm run test:with-capture

TO ANALYZE:
  wireshark captures/api_capture_*.pcapng

COMMON FILTERS:
  http                                  - All HTTP
  http.response.code >= 400             - Errors
  http.request.line contains "Authorization" - Check auth
  tcp.port == 8080 && !tls              - Security check
  http.request.uri contains "/api/auth/login" - Login flow
```

---

## ⚠️ Important Notes

### You Must Run as Administrator

Wireshark needs admin privileges to capture network traffic.

**Always:** Right-click PowerShell → "Run as Administrator"

### Backend Must Be Running

Traffic only appears if your backend is actually running on port 8080.

---

## 📚 More Information

- **Full Guide:** [docs/network-capture.md](./docs/network-capture.md)
- **All Filters:** [docs/WIRESHARK_FILTERS.md](./docs/WIRESHARK_FILTERS.md)
- **How to Run:** [HOW_TO_RUN_NETWORK_CAPTURE.md](./HOW_TO_RUN_NETWORK_CAPTURE.md)

---

## ✅ Summary

**What Wireshark does:**
- Captures all network traffic
- Shows you HTTP requests and responses
- Helps debug API issues
- Verifies security (encrypted traffic)
- Shows authorization headers
- Finds errors

**How to use it:**
1. Run `npm run test:with-capture`
2. Open the capture file in Wireshark
3. Apply filters to find what you need
4. Click packets to see details

**That's it!** Wireshark is your network detective 🕵️

---

**Ready to start?** See [HOW_TO_RUN_NETWORK_CAPTURE.md](./HOW_TO_RUN_NETWORK_CAPTURE.md)

