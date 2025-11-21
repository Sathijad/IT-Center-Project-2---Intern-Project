/**
 * Run database migrations without needing psql
 * Usage: node scripts/run-migration.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'itcenter_auth',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
};

async function runMigration() {
  const client = new Client(DB_CONFIG);

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const migrations = [
      {
        name: 'Phase 1 base tables (app_users, roles, user_roles, login_audit)',
        filename: '../migrations/ensure_app_users_table.sql',
        optional: true,
      },
      {
        name: 'Phase 3 booking schema',
        filename: '../migrations/20250120_phase3_booking.sql',
        optional: false,
      },
    ];

    for (const migration of migrations) {
      const migrationPath = path.join(__dirname, migration.filename);
      console.log(`\nReading migration: ${migration.name}`);
      console.log(`Path: ${migrationPath}`);

      if (!fs.existsSync(migrationPath)) {
        if (migration.optional) {
          console.log(`⚠️  Optional migration not found, skipping: ${migrationPath}`);
          continue;
        }
        throw new Error(`Migration file not found: ${migrationPath}`);
      }

      const sql = fs.readFileSync(migrationPath, 'utf8');
      console.log(`Executing migration "${migration.name}"...`);
      await client.query(sql);
      console.log(`✅ "${migration.name}" completed successfully!`);
    }

    // Optionally run seed data
    const seedPath = path.join(__dirname, '../migrations/seed/rooms_seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('\nRunning seed data...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Seed data loaded successfully!');
    }

    // Verify tables
    console.log('\nVerifying booking tables...');
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rooms', 'bookings', 'blackout_windows', 'booking_audit')
      ORDER BY table_name;
    `);

    console.log('\nCreated tables:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    if (result.rows.length === 4) {
      console.log('\n✅ Booking tables created successfully!');
    } else {
      console.log(`\n⚠️  Expected 4 tables, found ${result.rows.length}`);
    }

    console.log('\nVerifying shared Phase 1 tables...');
    const phase1Result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('app_users', 'roles', 'user_roles', 'login_audit')
      ORDER BY table_name;
    `);

    phase1Result.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

    if (phase1Result.rows.length === 4) {
      console.log('\n✅ Shared Phase 1 tables available!');
    } else {
      console.log(`\n⚠️  Phase 1 tables missing: expected 4, found ${phase1Result.rows.length}`);
      console.log('   Run auth-backend against the shared DB or execute ensure_app_users_table.sql manually.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

// Run if called directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };

