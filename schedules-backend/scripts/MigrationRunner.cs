using System;
using System.IO;
using System.Threading.Tasks;
using Npgsql;

class MigrationRunner
{
    static async Task Main(string[] args)
    {
        // Check if user wants to check user existence
        if (args.Length > 0 && args[0] == "--check-user")
        {
            await CheckUser();
            return;
        }
        
        // RDS connection details from Phase 3 config
        var host = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com";
        var port = 5432;
        var database = "itcenter_auth";
        var username = "postgres";
        var password = "password";
        var sqlFile = Path.Combine("..", "..", "migrations", "20251125_phase4_schedules.sql");
        
        // If running from scripts directory, adjust path
        if (!File.Exists(sqlFile))
        {
            sqlFile = Path.Combine("migrations", "20251125_phase4_schedules.sql");
        }
        
        var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;Timeout=30";
        
        Console.WriteLine("========================================");
        Console.WriteLine("Phase 4 SQL Migration Runner");
        Console.WriteLine("========================================");
        Console.WriteLine("");
        Console.WriteLine("Connecting to RDS...");
        Console.WriteLine($"Host: {host}");
        Console.WriteLine($"Database: {database}");
        Console.WriteLine("");
        
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            Console.WriteLine("✅ Connected to RDS successfully!");
            Console.WriteLine("");
            
            if (!File.Exists(sqlFile))
            {
                Console.WriteLine($"❌ ERROR: SQL file not found: {sqlFile}");
                Console.WriteLine($"Current directory: {Directory.GetCurrentDirectory()}");
                Environment.Exit(1);
            }
            
            Console.WriteLine($"Reading SQL file: {sqlFile}");
            var sql = await File.ReadAllTextAsync(sqlFile);
            Console.WriteLine($"✅ SQL file read ({sql.Length} characters)");
            Console.WriteLine("");
            
            Console.WriteLine("Executing migration...");
            Console.WriteLine("This may take a few seconds...");
            Console.WriteLine("");
            
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.CommandTimeout = 120; // 2 minutes timeout
            
            await cmd.ExecuteNonQueryAsync();
            
            Console.WriteLine("✅ Migration executed successfully!");
            Console.WriteLine("");
            
            // Verify tables were created
            Console.WriteLine("Verifying tables...");
            var verifySql = @"
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                  AND table_name IN ('schedules', 'tasks', 'task_notes', 'recurrences', 'import_jobs')
                ORDER BY table_name;
            ";
            
            using var verifyCmd = new NpgsqlCommand(verifySql, conn);
            using var reader = await verifyCmd.ExecuteReaderAsync();
            
            var tables = new System.Collections.Generic.List<string>();
            while (await reader.ReadAsync())
            {
                tables.Add(reader.GetString(0));
            }
            
            Console.WriteLine("");
            if (tables.Count == 5)
            {
                Console.WriteLine("✅ All 5 Phase 4 tables created successfully:");
                foreach (var table in tables)
                {
                    Console.WriteLine($"   - {table}");
                }
            }
            else
            {
                Console.WriteLine($"⚠️  Warning: Expected 5 tables, found {tables.Count}");
                foreach (var table in tables)
                {
                    Console.WriteLine($"   - {table}");
                }
            }
            
            Console.WriteLine("");
            Console.WriteLine("✅ Migration completed successfully!");
            Console.WriteLine("");
            Console.WriteLine("You can now verify the tables in pgAdmin.");
        }
        catch (Exception ex)
        {
            Console.WriteLine("");
            Console.WriteLine($"❌ ERROR: {ex.Message}");
            Console.WriteLine("");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"Inner Exception: {ex.InnerException.Message}");
            }
            Console.WriteLine($"Stack Trace: {ex.StackTrace}");
            Environment.Exit(1);
        }
    }
    
    static async Task CheckUser()
    {
        var host = "itcenter-auth.cfeacycaqhdx.ap-southeast-2.rds.amazonaws.com";
        var port = 5432;
        var database = "itcenter_auth";
        var username = "postgres";
        var password = "password";
        var cognitoSub = "495e04a8-5051-70d0-3e40-4305d8945778";
        
        var connectionString = $"Host={host};Port={port};Database={database};Username={username};Password={password};SSL Mode=Require;Trust Server Certificate=true;Timeout=30";
        
        Console.WriteLine("========================================");
        Console.WriteLine("Check User in Database");
        Console.WriteLine("========================================");
        Console.WriteLine("");
        Console.WriteLine($"Cognito Sub: {cognitoSub}");
        Console.WriteLine("");
        
        try
        {
            using var conn = new NpgsqlConnection(connectionString);
            await conn.OpenAsync();
            Console.WriteLine("✅ Connected to database");
            Console.WriteLine("");
            
            var sql = "SELECT id, cognito_sub, email, display_name FROM app_users WHERE cognito_sub = @sub";
            using var cmd = new NpgsqlCommand(sql, conn);
            cmd.Parameters.AddWithValue("sub", cognitoSub);
            
            using var reader = await cmd.ExecuteReaderAsync();
            
            if (await reader.ReadAsync())
            {
                var id = reader.GetInt64(0);
                var sub = reader.GetString(1);
                var email = reader.IsDBNull(2) ? "N/A" : reader.GetString(2);
                var name = reader.IsDBNull(3) ? "N/A" : reader.GetString(3);
                
                Console.WriteLine("✅ User found in database:");
                Console.WriteLine($"   ID: {id}");
                Console.WriteLine($"   Cognito Sub: {sub}");
                Console.WriteLine($"   Email: {email}");
                Console.WriteLine($"   Display Name: {name}");
                Console.WriteLine("");
                Console.WriteLine($"✅ This user ID ({id}) should work with the schedules API!");
            }
            else
            {
                Console.WriteLine("❌ User NOT found in database!");
                Console.WriteLine("");
                Console.WriteLine("The user needs to be created. Options:");
                Console.WriteLine("1. Log in through the admin portal (http://localhost:5173)");
                Console.WriteLine("   This should create the user via JIT provisioning");
                Console.WriteLine("");
                Console.WriteLine("2. Or manually insert the user in pgAdmin:");
                Console.WriteLine($"   INSERT INTO app_users (cognito_sub, email, display_name, is_active)");
                Console.WriteLine($"   VALUES ('{cognitoSub}', 'user@example.com', 'User Name', true);");
                Console.WriteLine($"   Then get the ID: SELECT id FROM app_users WHERE cognito_sub = '{cognitoSub}';");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Error: {ex.Message}");
            if (ex.InnerException != null)
            {
                Console.WriteLine($"   Inner: {ex.InnerException.Message}");
            }
            Environment.Exit(1);
        }
    }
}

