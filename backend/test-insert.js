// Quick test untuk insert user ke database
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function testInsert() {
  try {
    console.log('🧪 Testing user insert...\n');

    const db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'eduarchive_db',
    });

    console.log('✅ Connected to database\n');

    // Test data
    const testUser = {
      name: 'Test User ' + Date.now(),
      email: `test${Date.now()}@example.com`,
      password: 'password123',
      role: 'student',
      school: 'Test School'
    };

    // Hash password
    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    console.log('🔐 Password hashed:', hashedPassword.substring(0, 30) + '...\n');

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role, school, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [testUser.name, testUser.email, hashedPassword, testUser.role, testUser.school]
    );

    console.log('✅ User inserted!');
    console.log('   ID:', result.insertId);
    console.log('   Name:', testUser.name);
    console.log('   Email:', testUser.email);
    console.log('   Role:', testUser.role);
    console.log('');

    // Verify insert
    const [users] = await db.execute('SELECT * FROM users WHERE id = ?', [result.insertId]);
    const insertedUser = users[0];

    console.log('📊 User dalam database:');
    console.log({
      id: insertedUser.id,
      name: insertedUser.name,
      email: insertedUser.email,
      role: insertedUser.role,
      school: insertedUser.school,
      password_hash: insertedUser.password.substring(0, 30) + '...',
      created_at: insertedUser.created_at
    });

    // Test password verify
    const isValid = await bcrypt.compare(testUser.password, insertedUser.password);
    console.log('\n🔍 Password verification:', isValid ? '✅ Valid' : '❌ Invalid');

    await db.end();
    console.log('\n✅ Test complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('⚠️  Email already exists');
    }
  }
}

testInsert();

