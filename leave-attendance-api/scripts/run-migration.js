/**
 * Node.js script to run the fix_leave_balances.sql migration
 * This script uses a direct database connection
 */

require('dotenv').config();
const { Pool } = require('pg');

// Create database connection using same config as the project
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'itcenter_auth',
  user: process.env.DB_USER || 'itcenter',
  password: process.env.DB_PASSWORD || 'password',
});

async function query(text, params) {
  const result = await pool.query(text, params);
  return result.rows;
}

async function runMigration() {
  console.log('🚀 Starting leave_balances migration...\n');

  try {
    console.log('📊 Executing migration steps...\n');

    // Step 1: Fix NULL values
    console.log('Step 1: Fixing NULL balance_days values...');
    const updateResult = await query(
      `UPDATE leave_balances
       SET balance_days = 0
       WHERE balance_days IS NULL`
    );
    console.log(`✅ Updated ${updateResult.length || 0} rows with NULL values\n`);

    // Step 2: Set default value (with check)
    console.log('Step 2: Setting default value for balance_days...');
    try {
      await query(`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 
                FROM information_schema.columns 
                WHERE table_name = 'leave_balances' 
                AND column_name = 'balance_days' 
                AND column_default IS NOT NULL
            ) THEN
                ALTER TABLE leave_balances
                ALTER COLUMN balance_days SET DEFAULT 0;
            END IF;
        END $$;
      `);
      console.log('✅ Default value set (or already exists)\n');
    } catch (error) {
      if (error.message.includes('does not exist') || error.message.includes('relation')) {
        console.log('⚠️  Table leave_balances might not exist yet. Run Phase 2 migrations first.\n');
      } else {
        throw error;
      }
    }

    // Step 3: Verify
    console.log('Step 3: Verifying migration...');
    const verifyResult = await query(`
      SELECT 
        COUNT(*) as total_rows,
        COUNT(CASE WHEN balance_days IS NULL THEN 1 END) as null_count,
        COUNT(CASE WHEN balance_days < 0 THEN 1 END) as negative_count
      FROM leave_balances
    `);

    const stats = verifyResult[0];
    console.log('\n📊 Migration Results:');
    console.log(`   Total rows: ${stats.total_rows}`);
    console.log(`   NULL values: ${stats.null_count}`);
    console.log(`   Negative values: ${stats.negative_count}\n`);

    if (parseInt(stats.null_count) === 0 && parseInt(stats.negative_count) === 0) {
      console.log('✅ Migration completed successfully!');
      console.log('   - No NULL values found');
      console.log('   - No negative values found\n');
    } else {
      console.log('⚠️  Migration completed with warnings:');
      if (parseInt(stats.null_count) > 0) {
        console.log(`   - ${stats.null_count} NULL values still exist (may need manual fix)`);
      }
      if (parseInt(stats.negative_count) > 0) {
        console.log(`   - ${stats.negative_count} negative values found (consider fixing)\n`);
      }
    }

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Code: ${error.code}`);
    }
    console.error('\nPlease check:');
    console.error('   1. Database connection settings in .env file');
    console.error('   2. Database itcenter_auth exists');
    console.error('   3. Table leave_balances exists (run Phase 2 migrations first)');
    console.error('   4. User has proper permissions\n');
    await pool.end();
    process.exit(1);
  }
}

// Run the migration
runMigration();

