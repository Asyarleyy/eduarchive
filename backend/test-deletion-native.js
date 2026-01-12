import http from 'http';

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                } catch (e) {
                    console.error('Parse error:', e.message);
                    resolve({
                        status: res.statusCode,
                        data: body
                    });
                }
            });
        });

        req.on('error', (err) => {
            console.error('Request error:', err.message);
            reject(err);
        });
        if (data) req.write(JSON.stringify(data));
        req.end();
    });
}

async function test() {
    try {
        console.log('🧪 Testing User Deletion with Reason Feature\n');

        // 1. Login
        console.log('1️⃣  Logging in as admin...');
        const loginRes = await makeRequest('POST', '/api/login', {
            email: 'admin@gmail.com',
            password: 'admin1234'
        });

        console.log(`Status: ${loginRes.status}`);
        console.log(`Response:`, JSON.stringify(loginRes.data, null, 2));

        if (loginRes.status !== 200) {
            console.log('❌ Login failed');
            return;
        }

        const token = loginRes.data.token;
        console.log('✅ Admin logged in\n');

        // 2. Get users
        console.log('2️⃣  Fetching users...');
        const usersRes = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: '/api/admin/users',
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                });
            });

            req.on('error', reject);
            req.end();
        });

        const users = usersRes.data.users || [];
        const testUser = users.find(u => u.role !== 'administrator' && u.id !== loginRes.data.user.id);

        if (!testUser) {
            console.log('❌ No user available for testing');
            return;
        }

        console.log(`✅ Found user: ${testUser.name} (ID: ${testUser.id})\n`);

        // 3. Try to delete without reason (should fail)
        console.log('3️⃣  Testing deletion WITHOUT reason (should fail)...');
        const badDeleteRes = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: `/api/admin/users/${testUser.id}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify({}));
            req.end();
        });

        if (badDeleteRes.status === 400) {
            console.log(`✅ Correctly rejected: ${badDeleteRes.data.error}\n`);
        } else {
            console.log(`❌ Should have failed but got status ${badDeleteRes.status}\n`);
        }

        // 4. Delete WITH reason
        console.log('4️⃣  Deleting user WITH reason...');
        const reason = 'Violation of community guidelines';
        const deleteRes = await new Promise((resolve, reject) => {
            const options = {
                hostname: 'localhost',
                port: 3001,
                path: `/api/admin/users/${testUser.id}`,
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        status: res.statusCode,
                        data: JSON.parse(body)
                    });
                });
            });

            req.on('error', reject);
            req.write(JSON.stringify({ reason }));
            req.end();
        });

        if (deleteRes.status === 200) {
            console.log(`✅ User deleted successfully\n`);
        } else {
            console.log(`❌ Delete failed: ${deleteRes.data.error}\n`);
            return;
        }

        // 5. Try to login with deleted user
        console.log('5️⃣  Attempting login with deleted user...');
        const deletedLoginRes = await makeRequest('POST', '/api/login', {
            email: testUser.email,
            password: 'password123'
        });

        if (deletedLoginRes.status === 403 && deletedLoginRes.data.reason) {
            console.log(`✅ Login blocked for deleted user`);
            console.log(`📝 Reason returned: "${deletedLoginRes.data.reason}"\n`);
            console.log('🎉 All tests passed!\n');
        } else {
            console.log(`❌ Unexpected response: Status ${deletedLoginRes.status}`);
            console.log(`Response:`, JSON.stringify(deletedLoginRes.data, null, 2));
        }

    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

test();
