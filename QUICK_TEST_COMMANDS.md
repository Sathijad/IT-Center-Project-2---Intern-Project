# Quick Test Commands - Copy & Paste

## ✅ COMMANDS TO RUN TESTS (Copy & Paste These)

### 1. Frontend Tests (Working)
```powershell
cd admin-web
npm test -- --run
```
**Current Status:** Some tests passing, some failing
**Passing:** Login tests, ProtectedRoute tests
**Failing:** Accessibility, ProfileForm tests

---

### 2. Mobile Tests (Working)  
```powershell
cd mobile-app
flutter test
```
**Expected:** All 6 tests passing ✅

---

### 3. Backend Tests (Need JAVA_HOME)
```powershell
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
cd auth-backend
./mvnw test -Dspring.profiles.active=test
```
**Expected:** 31 tests passing (when Java 21 configured)

---

### 4. Postman Tests (Need Backend Running)
```powershell
# First start backend
cd auth-backend
./mvnw spring-boot:run

# Then in another terminal:
cd tests/postman
newman run itcenter-auth.postman_collection.json -e itcenter-auth.postman_environment.json
```

---

### 5. Security Scans (Need Docker + Backend Running)
```powershell
docker run --rm -t owasp/zap2docker-stable zap-baseline.py -t http://localhost:8080 -r report.html
```

---

## 🎯 CURRENT TEST STATUS

| Component | Tests Created | Can Run? | Status |
|-----------|--------------|----------|--------|
| **Frontend** | 10 tests | ✅ YES | 4/10 passing |
| **Mobile** | 6 tests | ✅ YES | ✅ All passing |
| **Backend** | 31 tests | ❌ NO | Needs JAVA_HOME |
| **Postman** | 7 tests | ❌ NO | Needs backend running |
| **Security** | 0 tests | ❌ NO | Manual scan needed |

**Total:** 54 tests created, some need setup

---

## 📝 SIMPLE SUMMARY

**What You Can Run Now:**
1. ✅ Mobile tests (just run `flutter test`)
2. ⚠️ Frontend tests (some work, some need fixes)
3. ❌ Backend tests (need Java 21 setup)
4. ❌ Postman tests (need backend running)
5. ❌ Security tests (manual scan)

**Next Step:** Fix the failing frontend tests, then setup Java for backend tests.

