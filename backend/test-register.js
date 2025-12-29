// Simple test script untuk test register API
// Install axios first: npm install axios
import axios from 'axios';

const API_URL = 'http://localhost:3001';

async function testRegister() {
  try {
    console.log('🧪 Testing Register API...\n');

    const testUser = {
      name: 'Test User',
      email: `test${Date.now()}@test.com`, // Unique email
      password: 'password123',
      role: 'student',
      school: 'Test School'
    };

    console.log('📝 Registering user:', testUser);
    console.log('');

    const response = await axios.post(`${API_URL}/api/register`, testUser);

    console.log('✅ Success!');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('');
    console.log('🔑 Token:', response.data.token);
    console.log('👤 User:', response.data.user);
    console.log('');
    console.log('✅ User dah register! Check database untuk verify.');

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

// Check if backend is running
async function checkBackend() {
  try {
    await axios.get(`${API_URL}/api/user`);
    console.log('✅ Backend is running');
    return true;
  } catch (error) {
    console.log('❌ Backend not running or not accessible');
    console.log('Please start backend: cd backend && npm run dev');
    return false;
  }
}

// Run test
console.log('🔍 Checking backend...\n');
checkBackend().then((isRunning) => {
  if (isRunning) {
    setTimeout(() => testRegister(), 1000);
  } else {
    console.log('\n⚠️  Please start backend first!');
  }
});

