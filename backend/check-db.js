// Quick script untuk check database connection dan test insert
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

async function testDatabase() {
  try {
    console.log('🔍 Testing database connection...\n');

    // Connect to database
    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'eduarchive_db',
    });

    console.log('✅ Connected to MySQL database\n');

    // Check users table
    const [users] = await db.execute('SELECT COUNT(*) as count FROM users');
    console.log(`📊 Current users in database: ${users[0].count}\n`);

    // Show last 5 users
    const [lastUsers] = await db.execute(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );

    if (lastUsers.length > 0) {
      console.log('👥 Last 5 users:');
      console.table(lastUsers);
    } else {
      console.log('📭 No users in database yet\n');
    }

    // Test insert (optional)
    console.log('\n🧪 Testing insert...');
    const testEmail = `test${Date.now()}@test.com`;
    const hashedPassword = await bcrypt.hash('test123', 10);

    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      ['Test User', testEmail, hashedPassword, 'student']
    );

    console.log(`✅ Test user created with ID: ${result.insertId}`);
    console.log(`📧 Email: ${testEmail}\n`);

    // Verify insert
    const [newUser] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    console.log('✅ User in database:');
    console.log({
      id: newUser[0].id,
      name: newUser[0].name,
      email: newUser[0].email,
      role: newUser[0].role,
      created_at: newUser[0].created_at
    });

    await db.end();
    console.log('\n✅ Database test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('⚠️  Cannot connect to MySQL. Check:');
      console.error('   - XAMPP MySQL service running?');
      console.error('   - Database name correct?');
      console.error('   - .env file configured?');
    }
  }
}

testDatabase();

