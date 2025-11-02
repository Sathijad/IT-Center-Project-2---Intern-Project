// Test setup file
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DB_NAME = process.env.DB_NAME || 'itcenter_auth_test';

