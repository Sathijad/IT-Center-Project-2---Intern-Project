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

    // Read migration file
    const migrationPath = path.join(__dirname, '../migrations/20250120_phase3_booking.sql');
    console.log(`Reading migration file: ${migrationPath}`);
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('Executing migration...');

    await client.query(sql);
    console.log('✅ Migration completed successfully!');

    // Optionally run seed data
    const seedPath = path.join(__dirname, '../migrations/seed/rooms_seed.sql');
    if (fs.existsSync(seedPath)) {
      console.log('\nRunning seed data...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('✅ Seed data loaded successfully!');
    }

    // Verify tables
    console.log('\nVerifying tables...');
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
      console.log('\n✅ All tables created successfully!');
    } else {
      console.log(`\n⚠️  Expected 4 tables, found ${result.rows.length}`);
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

