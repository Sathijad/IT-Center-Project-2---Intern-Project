# How to View Your Database in pgAdmin

## Database Connection Details

Your database is running and waiting for you to connect! Here are the details:

### Connection Information
- **Host/Server:** `localhost` or `127.0.0.1`
- **Port:** `5432`
- **Database Name:** `itcenter_auth`
- **Username:** `itcenter`
- **Password:** `password`

---

## Step-by-Step Guide to Connect with pgAdmin

### 1. Open pgAdmin
- Launch pgAdmin application on your computer

### 2. Add a New Server Connection
1. In the left panel, right-click on **"Servers"**
2. Select **"Register"** → **"Server..."**

### 3. General Tab
- **Name:** `IT Center Local` (or any name you prefer)

### 4. Connection Tab
Fill in the following:
```
Host name/address:  localhost
Port:              5432
Maintenance database:  itcenter_auth
Username:          itcenter
Password:          password
```

**Important:** Check the box **"Save password"** if you want pgAdmin to remember it

### 5. Click "Save"
- The connection will be established
- You'll see the server appear in the left panel

---

## Viewing Your Database

### Expand the Server Tree
1. Click the arrow next to **"IT Center Local"** (or your server name)
2. Expand **"Databases"**
3. Click on **"itcenter_auth"**
4. Expand **"Schemas"**
5. Expand **"public"**
6. You'll see **"Tables"**

### View Database Tables
Click on **"Tables"** to see all your database tables:
- `app_users` - User information
- `roles` - User roles
- `user_roles` - User-role mapping
- `login_audit` - Login history

### Query Data
1. Right-click on any table
2. Select **"View/Edit Data"** → **"All Rows"**
3. You'll see all the data in that table

---

## Quick Connection Test

You can also test the connection using Command Prompt or PowerShell:

```powershell
# If you have psql installed
psql -h localhost -p 5432 -U itcenter -d itcenter_auth
```

When prompted, enter password: `password`

---

## Troubleshooting

### Problem: Cannot connect to the database

**Solution 1:** Make sure PostgreSQL is running
```powershell
netstat -ano | findstr :5432
```

**Solution 2:** Check if the database name is correct
- It should be: `itcenter_auth` (not `postgres`)

**Solution 3:** Verify credentials
- Username: `itcenter`
- Password: `password`

### Problem: pgAdmin shows "Unable to connect"

**Check:**
1. PostgreSQL is actually running
2. Port 5432 is not blocked by firewall
3. You're connecting to `localhost`, not a remote server

---

## Alternative: Using DBeaver (Free Database Tool)

If you don't have pgAdmin or prefer another tool:

1. Download DBeaver from https://dbeaver.io/
2. Click **"New Database Connection"**
3. Select **PostgreSQL**
4. Enter the same connection details
5. Click **"Test Connection"**
6. Enter password when prompted
7. Click **"Finish"**

---

## Verify Database is Working

You can verify your database has data by running this query in pgAdmin:

```sql
-- View all users
SELECT * FROM app_users;

-- View all roles
SELECT * FROM roles;

-- View login audit logs
SELECT * FROM login_audit ORDER BY login_time DESC;
```

---

## Quick Reference Card

```
╔════════════════════════════════════════════╗
║   IT Center Database Connection Info       ║
╠════════════════════════════════════════════╣
║  Host:      localhost                      ║
║  Port:      5432                           ║
║  Database:  itcenter_auth                  ║
║  Username:  itcenter                       ║
║  Password:  password                       ║
╚════════════════════════════════════════════╝
```

**Need Help?** Run the test script:
```powershell
powershell -ExecutionPolicy Bypass -File test-db-connection.ps1
```
