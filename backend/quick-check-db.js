// Quick check MySQL connection status
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

async function quickCheck() {
  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);
  
  console.log('🔍 Checking MySQL connection...\n');
  
  if (!envExists) {
    console.log('⚠️  WARNING: .env file not found!');
    console.log(`   Expected location: ${envPath}\n`);
    console.log('   Using default values...\n');
  }
  
  // Parse port as integer
  const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
  
  console.log('Connection details:');
  console.log(`  Host: ${process.env.DB_HOST || '127.0.0.1'}`);
  console.log(`  Port: ${dbPort} ${!process.env.DB_PORT ? '(default)' : '(from .env)'}`);
  console.log(`  User: ${process.env.DB_USER || 'root'}`);
  console.log(`  Database: ${process.env.DB_NAME || 'eduarchive_db'}`);
  if (process.env.DB_PASSWORD) {
    console.log(`  Password: ${'*'.repeat(process.env.DB_PASSWORD.length)} (set)`);
  } else {
    console.log(`  Password: (empty)`);
  }
  console.log('');

  try {
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: dbPort,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'eduarchive_db',
    });

    console.log('✅ MySQL is RUNNING and connected!\n');
    
    // Test query
    const [result] = await db.execute('SELECT VERSION() as version, DATABASE() as database_name');
    console.log(`📊 MySQL Version: ${result[0].version}`);
    console.log(`📊 Connected to: ${result[0].database_name}\n`);
    
    await db.end();
    console.log('✅ All checks passed!');
    process.exit(0);
    
  } catch (error) {
    console.log('❌ MySQL is NOT running or cannot connect!\n');
    console.log('Error details:');
    console.log(`  Code: ${error.code}`);
    console.log(`  Message: ${error.message}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Solution:');
      console.log('   1. Check if .env file exists in backend folder');
      console.log('   2. Verify DB_PORT in .env matches your MySQL port');
      console.log('   3. Open XAMPP Control Panel');
      console.log('   4. Click "Start" button next to MySQL');
      console.log('   5. Wait until MySQL status turns green');
      console.log('   6. Run this check again\n');
      console.log('📝 Note: If MySQL is on port 3301, make sure .env has:');
      console.log('   DB_PORT=3301\n');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('💡 Solution:');
      console.log('   - Database name might be wrong');
      console.log('   - Create the database in phpMyAdmin first\n');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('💡 Solution:');
      console.log('   - Check username and password in .env file\n');
    }
    
    process.exit(1);
  }
}

quickCheck();

