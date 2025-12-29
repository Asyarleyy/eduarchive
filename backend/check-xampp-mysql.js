// Check XAMPP MySQL port configuration
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Checking XAMPP MySQL Configuration...\n');

// Check .env file
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

if (envExists) {
  console.log('✅ .env file found');
  dotenv.config({ path: envPath });
} else {
  console.log('⚠️  .env file NOT found');
  console.log('   Location: ' + envPath + '\n');
}

// Common XAMPP MySQL ports to test
const portsToTest = [
  parseInt(process.env.DB_PORT || '0', 10), // From .env
  3306, // Default MySQL port
  3301, // Custom port (from user's config)
  3307, // Alternative XAMPP port
];

// Remove duplicates and invalid ports
const uniquePorts = [...new Set(portsToTest.filter(p => p > 0))];

console.log('🔌 Testing MySQL connection on different ports...\n');

let connected = false;

for (const port of uniquePorts) {
  try {
    console.log(`Testing port ${port}...`);
    
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: port,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      connectTimeout: 2000, // 2 seconds timeout
    });

    const [result] = await db.execute('SELECT VERSION() as version, @@port as port');
    
    console.log(`✅ SUCCESS! MySQL is running on port ${port}`);
    console.log(`   MySQL Version: ${result[0].version}`);
    console.log(`   Actual Port: ${result[0].port}\n`);
    
    // Try to connect to database
    try {
      await db.end();
      const dbConn = await mysql.createConnection({
        host: process.env.DB_HOST || '127.0.0.1',
        port: port,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'eduarchive_db',
      });
      
      console.log(`✅ Database '${process.env.DB_NAME || 'eduarchive_db'}' is accessible!\n`);
      await dbConn.end();
    } catch (dbError) {
      if (dbError.code === 'ER_BAD_DB_ERROR') {
        console.log(`⚠️  Database '${process.env.DB_NAME || 'eduarchive_db'}' does not exist`);
        console.log(`   Create it in phpMyAdmin first\n`);
      }
    }
    
    console.log('📝 Recommended .env configuration:');
    console.log(`   DB_PORT=${port}`);
    if (!process.env.DB_PASSWORD) {
      console.log(`   DB_PASSWORD= (empty or your password)`);
    }
    console.log('');
    
    connected = true;
    break;
    
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log(`   ❌ Port ${port} - Connection refused (MySQL not running or wrong port)\n`);
    } else if (error.code === 'ETIMEDOUT') {
      console.log(`   ❌ Port ${port} - Connection timeout\n`);
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log(`   ⚠️  Port ${port} - Access denied (wrong username/password)\n`);
    } else {
      console.log(`   ❌ Port ${port} - ${error.message}\n`);
    }
  }
}

if (!connected) {
  console.log('❌ Could not connect to MySQL on any tested port!\n');
  console.log('💡 Solutions:');
  console.log('   1. Open XAMPP Control Panel');
  console.log('   2. Make sure MySQL status is GREEN (running)');
  console.log('   3. If MySQL is stopped, click "Start" button');
  console.log('   4. Check MySQL port in XAMPP config (usually in my.ini or my.cnf)');
  console.log('   5. Make sure no firewall is blocking the connection\n');
}

