# Quick Start Guide - Phase 3 Booking System

## 🚀 Fastest Way to Get Running

### 1. Database (5 minutes)

**Option A: Using Node.js (No psql needed!)**

```bash
cd booking-backend
npm install

# Create .env file with your database credentials
# DB_HOST=your-rds-endpoint.rds.amazonaws.com
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=your-password
# DB_NAME=itcenter_auth
# DB_SSL=true

# Run migration (includes seed)
npm run migrate
```

**Option B: Using Database GUI (pgAdmin, DBeaver, etc.)**
- Open the SQL files in your GUI tool and execute them

**Option C: Using AWS RDS Query Editor**
- Copy/paste SQL into AWS Console Query Editor

### 2. Backend Deployment to AWS (10 minutes)

**This creates Lambda functions and API Gateway (just like Phase 2)!**

```bash
cd booking-backend

# Install (if not done)
npm install

# Edit config/env.dev.yml with your:
# - Database credentials
# - Cognito settings (same as Phase 2)
# - VPC settings (same as Phase 2)

# Deploy to AWS
npm run deploy:dev

# This will create:
# ✅ Lambda functions (listRooms, createBooking, etc.)
# ✅ API Gateway HTTP API
# ✅ SQS queues
# ✅ CloudWatch alarms

# Copy the API Gateway URL from output (you'll need it for frontend)
```

### 3. Frontend (2 minutes)

```bash
cd admin-web

# Install
npm install

# Create .env.local
echo "VITE_BOOKING_API_BASE_URL=https://your-api-id.execute-api.ap-southeast-2.amazonaws.com" > .env.local

# Run
npm run dev
```

### 4. Test (1 minute)

1. Open http://localhost:5173
2. Login
3. Go to `/booking/book`
4. Create a test booking

## ✅ Done!

Your booking system is now running!

## Common Issues

**"Cannot connect to database"**
- Check VPC/subnet configuration in `env.dev.yml`
- Verify security groups allow Lambda → RDS

**"401 Unauthorized"**
- Check Cognito User Pool ID and Client ID
- Verify token is valid and not expired

**"CORS error"**
- Add your frontend URL to `allowedOrigins` in `env.dev.yml`
- Redeploy backend

## Need More Details?

See `DEPLOYMENT_GUIDE.md` for comprehensive instructions.
