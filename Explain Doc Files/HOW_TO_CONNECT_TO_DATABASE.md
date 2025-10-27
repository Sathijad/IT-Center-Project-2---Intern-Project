# How to Connect to Your Database

## Problem
You're trying to use `psql` command but it's not installed on your Windows machine.

## Solution: Use Docker to Run psql

Since your database is running in Docker, you can use Docker to access the database without installing `psql` on your machine.

### Step 1: Start Docker Desktop
1. Open Docker Desktop application on your computer
2. Wait until Docker Desktop is fully started (you'll see the Docker icon in your system tray)

### Step 2: Start Your Database (if not running)
Open PowerShell in the project directory and run:
```powershell
docker compose -f infra/docker-compose.yml up -d
```

### Step 3: Connect to Database Using Docker
Use this command to connect to your database:
```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth
```

This will start an interactive database session. You'll see a prompt like:
```
itcenter_auth=#
```

### Step 4: Run SQL Commands
Now you can run SQL commands. Here are some useful ones:

```sql
-- List all tables
\dt

-- View all users
SELECT * FROM app_users;

-- View all roles
SELECT * FROM roles;

-- View login audit logs
SELECT * FROM login_audit ORDER BY login_time DESC LIMIT 10;

-- Exit the database
\q
```

## Alternative: Use a Database GUI Tool

If you prefer a graphical interface, you can use:

### Option 1: pgAdmin
1. Download from: https://www.pgadmin.org/download/
2. Connection details:
   - **Host:** localhost
   - **Port:** 5432
   - **Database:** itcenter_auth
   - **Username:** itcenter
   - **Password:** password

### Option 2: DBeaver (Recommended - Free and Easy)
1. Download from: https://dbeaver.io/download/
2. Install DBeaver
3. Open DBeaver and click "New Database Connection"
4. Select "PostgreSQL"
5. Enter the connection details:
   - **Host:** localhost
   - **Port:** 5432
   - **Database:** itcenter_auth
   - **Username:** itcenter
   - **Password:** password
6. Click "Test Connection" and then "Finish"

## Quick Commands Reference

### Check if database is running
```powershell
docker ps | findstr itcenter_pg
```

### Start database if not running
```powershell
docker compose -f infra/docker-compose.yml up -d
```

### Stop database
```powershell
docker compose -f infra/docker-compose.yml down
```

### View database logs
```powershell
docker logs itcenter_pg
```

### Connect to database
```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth
```

### Run a single SQL command without entering interactive mode
```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT * FROM app_users;"
```

## Database Connection Details

```
╔════════════════════════════════════════════╗
║   IT Center Database Connection Info       ║
╠════════════════════════════════════════════╣
║  Host:      localhost                      ║
║  Port:      5432                           ║
║  Database:  itcenter_auth                  ║
║  Username:  itcenter                       ║
║  Password:  password                       ║
║  Container: itcenter_pg                    ║
╚════════════════════════════════════════════╝
```

## Troubleshooting

### Error: "The system cannot find the file specified"
**Solution:** Docker Desktop is not running. Start Docker Desktop first.

### Error: "container itcenter_pg not found"
**Solution:** Start the database container:
```powershell
docker compose -f infra/docker-compose.yml up -d
```

### Error: "connection refused"
**Solution:** Check if the database is running:
```powershell
docker ps
```

If the container is not in the list, start it:
```powershell
docker compose -f infra/docker-compose.yml up -d
```
