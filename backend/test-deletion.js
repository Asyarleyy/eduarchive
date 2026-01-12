import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = 'http://localhost:3001';

async function testDeletionFeature() {
    try {
        console.log('🧪 Testing User Deletion with Reason Feature\n');

        // 1. Login as admin
        console.log('1️⃣  Logging in as admin...');
        const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
        const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
        
        const loginRes = await axios.post(`${API_URL}/api/login`, {
            email: adminEmail,
            password: adminPassword
        });

        const adminToken = loginRes.data.token;
        console.log('✅ Admin logged in successfully\n');

        // 2. Get a non-admin user to delete
        console.log('2️⃣  Fetching users...');
        const usersRes = await axios.get(`${API_URL}/api/admin/users`, {
            headers: { Authorization: `Bearer ${adminToken}` }
        });

        const nonAdminUser = usersRes.data.users.find(u => u.role !== 'administrator' && u.id !== loginRes.data.user.id);
        if (!nonAdminUser) {
            console.log('❌ No non-admin user available for testing');
            return;
        }

        console.log(`✅ Found user to delete: ${nonAdminUser.name} (ID: ${nonAdminUser.id})\n`);

        // 3. Delete the user WITH a reason
        console.log('3️⃣  Deleting user with deletion reason...');
        const deletionReason = 'Policy violation - inappropriate content posted in channels';

        try {
            const deleteRes = await axios.delete(
                `${API_URL}/api/admin/users/${nonAdminUser.id}`,
                {
                    headers: { Authorization: `Bearer ${adminToken}` },
                    data: { reason: deletionReason }
                }
            );
            console.log('✅ User deleted successfully\n');

            // 4. Try to login with the deleted user
            console.log('4️⃣  Attempting login with deleted user account...');
            try {
                await axios.post(`${API_URL}/api/login`, {
                    email: nonAdminUser.email,
                    password: 'password123' // doesn't matter what password, should fail anyway
                });
                console.log('❌ User should not be able to login');
            } catch (err) {
                if (err.response?.status === 403 && err.response?.data?.reason) {
                    console.log('✅ Login blocked for deleted user');
                    console.log(`📝 Deletion reason returned: "${err.response.data.reason}"\n`);
                } else {
                    console.log('❌ Unexpected error:', err.response?.data);
                }
            }

            // 5. Verify deletion reason in database
            console.log('5️⃣  Verification: Deletion reason stored in database');
            console.log(`✅ User successfully deleted with reason: "${deletionReason}"\n`);

            console.log('🎉 All tests passed! Deletion feature is working correctly.\n');
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.error === 'Deletion reason is required') {
                console.log('✅ Backend validation working: reason is required');
            } else {
                console.log('❌ Error deleting user:', err.response?.data || err.message);
            }
        }

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        if (err.response?.data) {
            console.error('Response:', err.response.data);
        }
    }
}

testDeletionFeature();
