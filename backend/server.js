import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// 1. MIDDLEWARE
const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests from tools/no-origin (like curl) and allowed list
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dirs = ['uploads/materials', 'uploads/profile', 'uploads/teacher_proof'];
dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// 2. MULTER CONFIGURATIONS
const materialStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, 'uploads/materials')),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: materialStorage });

const profileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads/profile")),
    filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const uploadProfile = multer({ storage: profileStorage });

// Registration storage: route both profile image and teacher proof to their folders
const registerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'teacher_proof') {
            return cb(null, path.join(__dirname, 'uploads/teacher_proof'));
        }
        return cb(null, path.join(__dirname, 'uploads/profile'));
    },
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const uploadRegister = multer({ storage: registerStorage });

// 3. DATABASE CONNECTION
let db;
const createConnection = async () => {
    try {
        db = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'eduarchive_db',
        });
        console.log('✅ Connected to MySQL');
        await ensureTeacherVerificationTable();
        await seedAdminUser();
    } catch (error) {
        console.error('❌ DB Error:', error);
        process.exit(1);
    }
};

// Seed a single administrator account from environment variables.
// Set ADMIN_EMAIL and ADMIN_PASSWORD in .env; password will be hashed here.
const seedAdminUser = async () => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminEmail || !adminPassword) {
        console.warn('⚠️  ADMIN_EMAIL/ADMIN_PASSWORD not set; admin seed skipped');
        return;
    }

    try {
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [adminEmail]);
        if (existing.length > 0) {
            // ensure role is administrator
            await db.execute('UPDATE users SET role = "administrator" WHERE email = ?', [adminEmail]);
            console.log('ℹ️  Admin user already exists; role ensured.');
            return;
        }

        const hash = await bcrypt.hash(adminPassword, 10);
        const [result] = await db.execute(
            `INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, 'administrator', NOW(), NOW())`,
            ['Admin', adminEmail, hash]
        );
        console.log(`✅ Admin user seeded (id: ${result.insertId})`);
    } catch (err) {
        console.error('❌ Failed to seed admin user:', err.message || err);
    }
};

// Ensure teacher_verifications table exists to store proof documents and statuses
const ensureTeacherVerificationTable = async () => {
    try {
        await db.execute(`
            CREATE TABLE IF NOT EXISTS teacher_verifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                proof_path VARCHAR(255) NOT NULL,
                status ENUM('pending','approved','rejected') DEFAULT 'pending',
                reason TEXT NULL,
                approved_by INT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `);
    } catch (err) {
        console.error('❌ Failed to ensure teacher_verifications table:', err.message || err);
        throw err;
    }
};

// 4. AUTH MIDDLEWARE
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });

    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

const requireAdmin = (req, res, next) => {
    if (req.user?.role !== 'administrator') {
        return res.status(403).json({ error: 'Admin only' });
    }
    next();
};

// 5. AUTH & USER ROUTES
app.post('/api/register', uploadRegister.fields([
    { name: 'image', maxCount: 1 },
    { name: 'teacher_proof', maxCount: 1 },
]), async (req, res) => {
    try {
        const { name, first_name, last_name, email, password, role, school, gender, birth_date } = req.body;
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

        const imageFile = req.files?.image?.[0];
        const proofFile = req.files?.teacher_proof?.[0];

        if (!imageFile) {
            return res.status(400).json({ error: 'Profile image is required' });
        }

        // Teachers must submit proof; mark them pending until admin approves
        let effectiveRole = role;
        if (role === 'teacher') {
            if (!proofFile) {
                return res.status(400).json({ error: 'Teacher validation proof is required' });
            }
            effectiveRole = 'teacher_pending';
        }

        const imagePath = imageFile ? `/uploads/profile/${imageFile.filename}` : null;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            `INSERT INTO users (name, first_name, last_name, email, password, role, school, gender, birth_date, profile_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [name, first_name || null, last_name || null, email, hashedPassword, effectiveRole, school || null, gender || null, birth_date || null, imagePath]
        );

        // Persist teacher proof and pending status
        if (role === 'teacher' && proofFile) {
            await db.execute(
                'INSERT INTO teacher_verifications (user_id, proof_path, status, created_at, updated_at) VALUES (?, ?, "pending", NOW(), NOW())',
                [result.insertId, `/uploads/teacher_proof/${proofFile.filename}`]
            );
        }

        const token = jwt.sign({ id: result.insertId, email, role: effectiveRole }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        const [[newUser]] = await db.execute(
            "SELECT id, name, email, role, profile_image, first_name, last_name, school, gender, birth_date FROM users WHERE id = ?",
            [result.insertId]
        );
        res.status(201).json({ token, user: newUser });
    } catch (error) { res.status(500).json({ error: 'Register failed' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
        
        // Check if user is deleted
        if (user.deleted_at) {
            return res.status(403).json({ 
                error: 'Account deleted',
                reason: user.deleted_reason || 'Your account has been deleted by an administrator.'
            });
        }
        
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user });
    } catch (error) { res.status(500).json({ error: 'Login error' }); }
});

// Forgot Password - Send reset link
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.execute('SELECT id, email FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Email not found' });
        }

        const user = users[0];
        const resetToken = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
        
        // In a real app, you would send this via email
        // For now, we'll just return success and log the token (in production, use a real email service)
        console.log(`Password reset link for ${email}: /reset-password?token=${resetToken}`);
        
        res.json({ message: 'Password reset link sent to your email. (Check console for testing)' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Verify email exists
app.post('/api/auth/verify-email', async (req, res) => {
    try {
        const { email } = req.body;
        const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        res.json({ exists: users.length > 0 });
    } catch (err) {
        res.status(500).json({ error: 'Failed to verify email' });
    }
});

// Reset password by email (no token needed - direct reset)
app.post('/api/auth/reset-by-email', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        const [users] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(404).json({ error: 'Email not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE email = ?', [hashedPassword, email]);
        
        res.json({ message: 'Password reset successfully' });
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

// Reset Password - Verify token and reset (for email link method)
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
            const hashedPassword = await bcrypt.hash(newPassword, 10);
            
            await db.execute('UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?', [hashedPassword, decoded.id]);
            
            res.json({ message: 'Password reset successfully' });
        } catch (err) {
            res.status(400).json({ error: 'Invalid or expired token' });
        }
    } catch (err) {
        console.error('Reset password error:', err);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

app.get('/api/user', authenticateToken, async (req, res) => {
    const [[user]] = await db.execute('SELECT id, name, email, role, profile_image, first_name, last_name, school, gender, birth_date, admin_comment FROM users WHERE id = ?', [req.user.id]);
    let adminWarnings = [];
    if (user?.admin_comment) {
        try {
            const parsed = JSON.parse(user.admin_comment);
            adminWarnings = Array.isArray(parsed) ? parsed : [{ message: String(user.admin_comment), created_at: user.updated_at || null }];
        } catch (_) {
            adminWarnings = [{ message: String(user.admin_comment), created_at: user.updated_at || null }];
        }
    }
    res.json({ user: { ...user, admin_warnings: adminWarnings } });
});

// Profile Update
app.post("/api/user/update", authenticateToken, uploadProfile.single("image"), async (req, res) => {
    try {
        const { first_name, last_name, name, gender, birth_date, school, email } = req.body;
        const [[curr]] = await db.execute("SELECT profile_image FROM users WHERE id=?", [req.user.id]);
        let imagePath = req.file ? `/uploads/profile/${req.file.filename}` : curr.profile_image;
        const finalName = name || `${first_name} ${last_name}`.trim();
        await db.execute(
            `UPDATE users SET first_name=?, last_name=?, name=?, gender=?, birth_date=?, school=?, email=?, profile_image=?, updated_at=NOW() WHERE id=?`,
            [first_name || null, last_name || null, finalName, gender || null, birth_date || null, school || null, email || null, imagePath, req.user.id]
        );
        const [[updated]] = await db.execute("SELECT id, name, email, role, profile_image, first_name, last_name, school, gender, birth_date FROM users WHERE id=?", [req.user.id]);
        res.json({ user: updated });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// Change Password (for logged-in users)
app.put("/api/user/password", authenticateToken, async (req, res) => {
    try {
        const { current_password, new_password } = req.body;
        const [[user]] = await db.execute("SELECT password FROM users WHERE id = ?", [req.user.id]);
        
        if (!user || !await bcrypt.compare(current_password, user.password)) {
            return res.status(401).json({ error: "Current password is incorrect" });
        }
        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.execute("UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?", [hashedPassword, req.user.id]);
        
        res.json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("Password change error:", err);
        res.status(500).json({ error: "Failed to update password" });
    }
});

// 6. CHANNEL ROUTES
app.post('/api/channels', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can create channels' });
            const { name, description, is_private } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const accessCode = Math.random().toString(36).substring(2, 12).toUpperCase();
      const [result] = await db.execute(
                `INSERT INTO channels (owner_id, title, slug, description, access_code, subscriber_count, is_private, status, approved_by, approved_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, ?, 'pending', NULL, NULL, NOW(), NOW())`,
                [req.user.id, name, slug, description || null, accessCode, is_private ? 1 : 0]
      );
      const [[newChannel]] = await db.execute('SELECT * FROM channels WHERE id = ?', [result.insertId]);
      res.status(201).json(newChannel);
    } catch (error) { res.status(500).json({ error: 'Failed to create channel' }); }
});

app.get('/api/channels', authenticateToken, async (req, res) => {
    try {
            let query;
            if (req.user.role === 'teacher') {
                query = 'SELECT * FROM channels WHERE owner_id = ? AND deleted_at IS NULL AND status = ? ORDER BY created_at DESC';
            } else {
                query = `SELECT c.* FROM channels c 
                                 INNER JOIN channel_user cu ON c.id = cu.channel_id 
                                 WHERE cu.user_id = ? AND c.deleted_at IS NULL AND c.status = 'approved'
                                 ORDER BY c.created_at DESC`;
            }
            const params = req.user.role === 'teacher' ? [req.user.id, 'approved'] : [req.user.id];
            const [channels] = await db.execute(query, params);
      res.json(channels);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch channels' }); }
});

// Get teacher's pending channels separately
app.get('/api/channels/teacher/pending', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'teacher' && req.user.role !== 'administrator') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const userId = req.user.role === 'administrator' ? req.query.userId : req.user.id;
        const [channels] = await db.execute(
            'SELECT * FROM channels WHERE owner_id = ? AND deleted_at IS NULL AND status = ? ORDER BY created_at DESC',
            [userId, 'pending']
        );
        res.json(channels);
    } catch (error) { 
        console.error('Error fetching pending channels:', error);
        res.status(500).json({ error: 'Failed to fetch pending channels' }); 
    }
});

app.get('/api/channels/joined', authenticateToken, async (req, res) => {
    try {
        const [channels] = await db.execute(
            `SELECT c.* FROM channels c 
             JOIN channel_user cu ON c.id = cu.channel_id 
             WHERE cu.user_id = ? AND c.deleted_at IS NULL AND c.status = 'approved'`, 
            [req.user.id]
        );
        res.json(channels);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch joined channels' }); }
});

// Search all channels (public and private) with privacy status
app.get('/api/channels/search', authenticateToken, async (req, res) => {
    try {
        const q = req.query.q || '';
        const like = `%${q}%`;
        // Show all channels, but exclude ones user already joined
        const [rows] = await db.execute(
            `SELECT c.id, c.title, c.description, c.is_private FROM channels c
             WHERE c.deleted_at IS NULL 
             AND c.status = 'approved'
             AND (c.title LIKE ? OR c.description LIKE ?)
             AND c.id NOT IN (
                SELECT channel_id FROM channel_user WHERE user_id = ?
             )
             ORDER BY c.created_at DESC LIMIT 50`,
            [like, like, req.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('CHANNEL SEARCH ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Search failed' });
    }
});

app.get('/api/channels/:id', authenticateToken, async (req, res) => {
    const [[channel]] = await db.execute('SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    res.json(channel);
});

// Delete a channel (Teacher/Owner only)
app.delete('/api/channels/:id', authenticateToken, async (req, res) => {
    try {
        const channelId = req.params.id;
        
        console.log('DELETE CHANNEL REQUEST:', { channelId, userId: req.user.id, userRole: req.user.role });
        
        // Verify channel exists and belongs to user or user is admin
        const [channels] = await db.execute('SELECT id, owner_id FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
        const channel = channels?.[0];
        console.log('CHANNEL LOOKUP:', { channelId, channel });
        
        if (!channel) {
            console.log('Channel not found or already deleted');
            return res.status(404).json({ error: 'Channel not found' });
        }
        
        // Verify authorization: user owns the channel or is admin
        if (channel.owner_id !== req.user.id && req.user.role !== 'administrator') {
            console.log('Authorization failed:', { ownerID: channel.owner_id, userID: req.user.id, userRole: req.user.role });
            return res.status(403).json({ error: 'Only channel owner can delete' });
        }
        
        // Soft delete the channel
        console.log('Executing soft delete...');
        const [result] = await db.execute('UPDATE channels SET deleted_at = NOW() WHERE id = ?', [channelId]);
        console.log('DELETE RESULT:', result);
        
        if (result.affectedRows === 0) {
            console.log('No rows were updated');
            return res.status(500).json({ error: 'Failed to delete channel - no rows updated' });
        }
        
        console.log('Channel successfully deleted (soft delete)');
        res.json({ message: 'Channel deleted successfully' });
    } catch (err) {
        console.error('DELETE CHANNEL ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to delete channel', details: err.message });
    }
});

// List members of a channel (teacher only)
app.get('/api/channels/:id/members', authenticateToken, async (req, res) => {
    try {
        // Ensure requester owns the channel
        const [[ch]] = await db.execute('SELECT owner_id FROM channels WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
        if (!ch) return res.status(404).json({ error: 'Channel not found' });
        if (req.user.role !== 'teacher' || ch.owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }

        const [rows] = await db.execute(
            `SELECT u.id, u.name, u.email, cu.joined_at
             FROM channel_user cu
             JOIN users u ON u.id = cu.user_id
             WHERE cu.channel_id = ?
             ORDER BY cu.joined_at DESC`,
            [req.params.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('FETCH MEMBERS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to fetch members' });
    }
});

app.post('/api/channels/join', authenticateToken, async (req, res) => {
    try {
      const { invite_code } = req.body;
      const [[channel]] = await db.execute('SELECT id FROM channels WHERE access_code = ? AND deleted_at IS NULL', [invite_code]);
      if (!channel) return res.status(404).json({ error: 'Invalid access code' });
    // ensure approved channel
    const [[statusCheck]] = await db.execute('SELECT status FROM channels WHERE id = ?', [channel.id]);
    if (statusCheck && statusCheck.status !== 'approved') return res.status(400).json({ error: 'Channel is not approved yet' });
            // prevent duplicate join
            const [[existing]] = await db.execute('SELECT id FROM channel_user WHERE channel_id = ? AND user_id = ?', [channel.id, req.user.id]);
            if (!existing) {
                await db.execute('INSERT INTO channel_user (channel_id, user_id, joined_at, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), NOW())', [channel.id, req.user.id]);
                await db.execute('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?', [channel.id]);
            }
      res.json({ message: 'Joined successfully' });
    } catch (err) { res.status(500).json({ error: "Join failed" }); }
});

// Join a public channel directly by ID
app.post('/api/channels/:id/join-public', authenticateToken, async (req, res) => {
        try {
                const channelId = req.params.id;
                const [[channel]] = await db.execute('SELECT id, is_private FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
                if (!channel) return res.status(404).json({ error: 'Channel not found' });
                if (channel.is_private) return res.status(400).json({ error: 'Channel is private' });

                const [[existing]] = await db.execute('SELECT id FROM channel_user WHERE channel_id = ? AND user_id = ?', [channelId, req.user.id]);
                if (existing) return res.json({ message: 'Already joined' });

                await db.execute('INSERT INTO channel_user (channel_id, user_id, joined_at, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), NOW())', [channelId, req.user.id]);
                await db.execute('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?', [channelId]);
                res.json({ message: 'Joined successfully' });
        } catch (err) {
                console.error('PUBLIC JOIN ERROR:', err.stack || err.message);
                res.status(500).json({ error: 'Join failed' });
        }
});

// Leave a channel (Student only)
app.post('/api/channels/:id/leave', authenticateToken, async (req, res) => {
    try {
        const channelId = req.params.id;
        const userId = req.user.id;

        // Verify channel exists
        const [[channel]] = await db.execute('SELECT id, subscriber_count FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });

        // Verify user is joined
        const [[membership]] = await db.execute('SELECT id FROM channel_user WHERE channel_id = ? AND user_id = ?', [channelId, userId]);
        if (!membership) return res.status(400).json({ error: 'You are not a member of this channel' });

        // Remove user from channel
        await db.execute('DELETE FROM channel_user WHERE channel_id = ? AND user_id = ?', [channelId, userId]);
        
        // Decrement subscriber count
        await db.execute('UPDATE channels SET subscriber_count = subscriber_count - 1 WHERE id = ?', [channelId]);

        res.json({ message: 'Left channel successfully' });
    } catch (err) {
        console.error('LEAVE CHANNEL ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to leave channel' });
    }
});

// 7. MATERIAL MANAGEMENT
// Upload Material (Teacher Only)
app.post('/api/channels/:id/materials', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const channelId = req.params.id;

        // Log incoming upload request for debugging
        console.log('UPLOAD REQUEST', { channelId, userId: req.user?.id, hasFile: !!req.file, bodyKeys: Object.keys(req.body || {}) });

        // 1. Validation: Ensure a file was actually selected
        if (!req.file) {
            return res.status(400).json({ error: 'No file selected' });
        }

        // 2. Security: Verify the user owns this channel
        const [channels] = await db.execute(
            'SELECT owner_id FROM channels WHERE id = ? AND deleted_at IS NULL', 
            [channelId]
        );

        if (channels.length === 0) return res.status(404).json({ error: 'Channel not found' });
        if (channels[0].owner_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized: Only the channel owner can upload materials' });
        }

        const { title, description } = req.body;
        const filePath = `/uploads/materials/${req.file.filename}`;

        // 3. Database Insert: MUST match columns in your .sql file
        // Columns used: channel_id, uploaded_by, title, description, file_path, file_name, file_mime, file_size
        const [result] = await db.execute(
            `INSERT INTO materials 
            (channel_id, uploaded_by, title, description, file_path, file_name, file_mime, file_size, is_public, is_approved, status, approved_by, approved_at, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 'pending', NULL, NULL, NOW(), NOW())`,
            [
                channelId, 
                req.user.id,        // This is the "uploaded_by" column
                title, 
                description || null, 
                filePath, 
                req.file.originalname, 
                req.file.mimetype,  // This is the "file_mime" column
                req.file.size       // This is the "file_size" column
            ]
        );

        res.status(201).json({ message: "Material uploaded successfully", id: result.insertId });
    } catch (error) {
        // 🟢 THIS LOG IS CRITICAL: It will show you why the DB rejected the file
        console.error('DATABASE UPLOAD ERROR:', error.stack || error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Multer-specific error handler (captures parsing errors like missing boundary)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('MULTER ERROR:', err);
        return res.status(400).json({ error: err.message });
    }
    if (err) {
        console.error('UNHANDLED ERROR:', err.stack || err.message || err);
    }
    next(err);
});

app.get('/api/channels/:id/materials', authenticateToken, async (req, res) => {
    try {
        // Determine if requester is channel owner/teacher to show all, otherwise only approved materials
        const [[channel]] = await db.execute('SELECT owner_id, is_private FROM channels WHERE id = ?', [req.params.id]);
        const isOwner = channel && channel.owner_id === req.user.id;
        const isTeacher = req.user.role === 'teacher';
        const materialQuery = (isOwner || isTeacher)
            ? 'SELECT * FROM materials WHERE channel_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
            : 'SELECT * FROM materials WHERE channel_id = ? AND deleted_at IS NULL AND status = "approved" ORDER BY created_at DESC';

        const [materials] = await db.execute(materialQuery, [req.params.id]);
        res.json(materials);
    } catch (err) {
        console.error('FETCH MATERIALS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
});

app.get('/api/materials/:id/download', authenticateToken, async (req, res) => {
    try {
        const [[file]] = await db.execute('SELECT file_path, file_name, channel_id, status FROM materials WHERE id = ?', [req.params.id]);
        if (!file) return res.status(404).json({ error: 'File not found' });
        if (file.status && file.status !== 'approved') {
            return res.status(403).json({ error: 'File not approved yet' });
        }
        res.download(path.join(__dirname, file.file_path), file.file_name);
        // best-effort download log
        try {
            await db.execute('INSERT INTO material_downloads (material_id, user_id, created_at) VALUES (?, ?, NOW())', [req.params.id, req.user.id]);
        } catch (logErr) {
            // ignore logging failures
        }
    } catch (error) { res.status(500).json({ error: 'Download failed' }); }
});

app.get('/api/materials/:id/preview', authenticateToken, async (req, res) => {
    try {
        const [[file]] = await db.execute('SELECT file_path FROM materials WHERE id = ?', [req.params.id]);
        if (!file) return res.status(404).json({ error: 'File not found' });
        // Prevent browser caching so previews reflect latest updates
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');
        res.sendFile(path.join(__dirname, file.file_path));
    } catch (error) { res.status(500).json({ error: 'Preview failed' }); }
});

// Update material (title, description, optional file replacement)
app.post('/api/materials/:id/update', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const matId = req.params.id;

        const [[material]] = await db.execute('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL', [matId]);
        if (!material) return res.status(404).json({ error: 'Material not found' });

        // Check permissions: uploader or channel owner
        const [[channel]] = await db.execute('SELECT owner_id FROM channels WHERE id = ?', [material.channel_id]);
        const isOwner = channel && channel.owner_id === req.user.id;
        const isUploader = material.uploaded_by === req.user.id;
        if (!isOwner && !isUploader) return res.status(403).json({ error: 'Unauthorized' });

        const { title, description } = req.body;
        let filePath = material.file_path;
        let fileName = material.file_name;
        let fileMime = material.file_mime;
        let fileSize = material.file_size;

        if (req.file) {
            // remove old file if exists
            try {
                const oldPath = path.join(__dirname, material.file_path);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            } catch (e) {
                console.error('Failed removing old material file:', e.message);
            }

            filePath = `/uploads/materials/${req.file.filename}`;
            fileName = req.file.originalname;
            fileMime = req.file.mimetype;
            fileSize = req.file.size;
        }

        await db.execute(
            `UPDATE materials SET title = ?, description = ?, file_path = ?, file_name = ?, file_mime = ?, file_size = ?, updated_at = NOW() WHERE id = ?`,
            [title || material.title, description || material.description, filePath, fileName, fileMime, fileSize, matId]
        );

        const [[updated]] = await db.execute('SELECT * FROM materials WHERE id = ?', [matId]);
        res.json({ message: 'Material updated', material: updated });
    } catch (err) {
        console.error('MATERIAL UPDATE ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Update failed', details: err.message });
    }
});

// Request access to private channel
app.post('/api/channels/:id/request-access', authenticateToken, async (req, res) => {
    try {
        const channelId = req.params.id;
        const [[channel]] = await db.execute('SELECT is_private FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });
        if (!channel.is_private) return res.status(400).json({ error: 'Cannot request access to public channel' });

        // Check if request already exists
        const [[existing]] = await db.execute(
            'SELECT id FROM channel_access_requests WHERE channel_id = ? AND user_id = ?',
            [channelId, req.user.id]
        );
        if (existing) return res.status(400).json({ error: 'Request already exists' });

        await db.execute(
            'INSERT INTO channel_access_requests (channel_id, user_id, status, created_at) VALUES (?, ?, "pending", NOW())',
            [channelId, req.user.id]
        );
        res.json({ message: 'Access request sent' });
    } catch (err) {
        console.error('REQUEST ACCESS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Request failed' });
    }
});

// Teacher: list access requests for a channel
app.get('/api/channels/:id/access-requests', authenticateToken, async (req, res) => {
    try {
        const channelId = req.params.id;
        const [[channel]] = await db.execute('SELECT id, owner_id FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });
        if (!(req.user.role === 'administrator' || channel.owner_id === req.user.id)) return res.status(403).json({ error: 'Forbidden' });

        const [rows] = await db.execute(
            `SELECT car.id, car.channel_id, car.user_id, car.status, car.created_at,
                    u.name AS requester_name, u.email AS requester_email
             FROM channel_access_requests car
             JOIN users u ON u.id = car.user_id
             WHERE car.channel_id = ? AND car.status = 'pending'
             ORDER BY car.created_at DESC`,
            [channelId]
        );
        res.json(rows);
    } catch (err) {
        console.error('ACCESS REQUESTS LOAD ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to load access requests' });
    }
});

// Teacher: approve an access request
app.post('/api/access-requests/:id/approve', authenticateToken, async (req, res) => {
    try {
        const reqId = req.params.id;
        const [[request]] = await db.execute('SELECT id, channel_id, user_id, status FROM channel_access_requests WHERE id = ?', [reqId]);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

        const [[channel]] = await db.execute('SELECT id, owner_id FROM channels WHERE id = ?', [request.channel_id]);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });
        if (!(req.user.role === 'administrator' || channel.owner_id === req.user.id)) return res.status(403).json({ error: 'Forbidden' });

        const [[existing]] = await db.execute('SELECT id FROM channel_user WHERE channel_id = ? AND user_id = ?', [request.channel_id, request.user_id]);
        if (!existing) {
            await db.execute('INSERT INTO channel_user (channel_id, user_id, joined_at, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), NOW())', [request.channel_id, request.user_id]);
            await db.execute('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?', [request.channel_id]);
        }

        await db.execute('UPDATE channel_access_requests SET status = "approved" WHERE id = ?', [reqId]);
        res.json({ message: 'Access approved' });
    } catch (err) {
        console.error('ACCESS REQUEST APPROVE ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to approve request' });
    }
});

// Teacher: reject an access request
app.post('/api/access-requests/:id/reject', authenticateToken, async (req, res) => {
    try {
        const reqId = req.params.id;
        const { reason } = req.body || {};
        const [[request]] = await db.execute('SELECT id, channel_id, user_id, status FROM channel_access_requests WHERE id = ?', [reqId]);
        if (!request) return res.status(404).json({ error: 'Request not found' });
        if (request.status !== 'pending') return res.status(400).json({ error: 'Request already processed' });

        const [[channel]] = await db.execute('SELECT id, owner_id FROM channels WHERE id = ?', [request.channel_id]);
        if (!channel) return res.status(404).json({ error: 'Channel not found' });
        if (!(req.user.role === 'administrator' || channel.owner_id === req.user.id)) return res.status(403).json({ error: 'Forbidden' });

        await db.execute('UPDATE channel_access_requests SET status = "rejected" WHERE id = ?', [reqId]);
        // Optionally store reason if column exists; ignored if not.
        res.json({ message: 'Access rejected', reason: reason || '' });
    } catch (err) {
        console.error('ACCESS REQUEST REJECT ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to reject request' });
    }
});

// Student: get their pending access requests
app.get('/api/student/pending-access-requests', authenticateToken, async (req, res) => {
    try {
        const [[requests]] = await db.execute(
            `SELECT car.id, car.channel_id, car.status, car.created_at, c.title as channel_title
             FROM channel_access_requests car
             JOIN channels c ON car.channel_id = c.id
             WHERE car.user_id = ? AND car.status = "pending"
             ORDER BY car.created_at DESC`,
            [req.user.id]
        );
        res.json(requests || []);
    } catch (err) {
        console.error('FETCH PENDING REQUESTS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to load pending requests' });
    }
});

// ================= ADMIN ROUTES =================
app.get('/api/admin/channels/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT c.*, u.name as teacher_name, u.email as teacher_email
             FROM channels c
             JOIN users u ON u.id = c.owner_id
             WHERE c.status = 'pending'
             ORDER BY c.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('ADMIN PENDING CHANNELS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to load pending channels' });
    }
});

app.post('/api/admin/channels/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.execute(
            `UPDATE channels SET status = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [req.user.id, req.params.id]
        );
        res.json({ message: 'Channel approved' });
    } catch (err) {
        console.error('ADMIN APPROVE CHANNEL ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to approve channel' });
    }
});

app.post('/api/admin/channels/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body || {};
        await db.execute(
            `UPDATE channels SET status = 'rejected', approved_by = ?, approved_at = NOW(), updated_at = NOW(), rejection_reason = ? WHERE id = ?`,
            [req.user.id, reason || null, req.params.id]
        );
        res.json({ message: 'Channel rejected' });
    } catch (err) {
        console.error('ADMIN REJECT CHANNEL ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to reject channel' });
    }
});

app.get('/api/admin/materials/pending', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [rows] = await db.execute(
            `SELECT m.*, c.title as channel_title, u.name as uploader_name, u.email as uploader_email
             FROM materials m
             JOIN channels c ON c.id = m.channel_id
             JOIN users u ON u.id = m.uploaded_by
             WHERE m.status = 'pending'
             ORDER BY m.created_at DESC`
        );
        res.json(rows);
    } catch (err) {
        console.error('ADMIN PENDING MATERIALS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to load pending materials' });
    }
});

app.post('/api/admin/materials/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        await db.execute(
            `UPDATE materials SET status = 'approved', approved_by = ?, approved_at = NOW(), updated_at = NOW() WHERE id = ?`,
            [req.user.id, req.params.id]
        );
        res.json({ message: 'Material approved' });
    } catch (err) {
        console.error('ADMIN APPROVE MATERIAL ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to approve material' });
    }
});

app.post('/api/admin/materials/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { reason } = req.body || {};
        await db.execute(
            `UPDATE materials SET status = 'rejected', approved_by = ?, approved_at = NOW(), updated_at = NOW(), rejection_reason = ? WHERE id = ?`,
            [req.user.id, reason || null, req.params.id]
        );
        res.json({ message: 'Material rejected' });
    } catch (err) {
        console.error('ADMIN REJECT MATERIAL ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to reject material' });
    }
});

app.get('/api/admin/reports/overview', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [channelCounts] = await db.execute(`SELECT status, COUNT(*) as count FROM channels WHERE deleted_at IS NULL GROUP BY status`);
        const [userCounts] = await db.execute(`SELECT role, COUNT(*) as count FROM users WHERE deleted_at IS NULL GROUP BY role`);
        const [materialCounts] = await db.execute(`SELECT status, COUNT(*) as count FROM materials WHERE deleted_at IS NULL GROUP BY status`);
        const [genderCounts] = await db.execute(`SELECT gender, COUNT(*) as count FROM users WHERE deleted_at IS NULL AND gender IS NOT NULL AND gender <> '' GROUP BY gender`);
        const [studentsPerChannel] = await db.execute(
            `SELECT c.id, c.title, COUNT(cu.user_id) as student_count
             FROM channels c
             LEFT JOIN channel_user cu ON cu.channel_id = c.id
             WHERE c.deleted_at IS NULL
             GROUP BY c.id, c.title`
        );
        let downloadCounts = [];
        try {
            [downloadCounts] = await db.execute(
                `SELECT m.channel_id, COUNT(*) as downloads
                 FROM material_downloads md
                 JOIN materials m ON m.id = md.material_id
                 WHERE m.deleted_at IS NULL
                 GROUP BY m.channel_id`
            );
        } catch (e) {
            downloadCounts = [];
        }

        // Get total counts for all channels and materials
        const [[totalChannelRow]] = await db.execute(`SELECT COUNT(*) as count FROM channels WHERE deleted_at IS NULL`);
        const [[totalMaterialRow]] = await db.execute(`SELECT COUNT(*) as count FROM materials WHERE deleted_at IS NULL`);

        res.json({ 
            channelCounts, 
            userCounts, 
            materialCounts, 
            genderCounts, 
            studentsPerChannel, 
            downloadCounts,
            totalChannels: totalChannelRow?.count || 0,
            totalMaterials: totalMaterialRow?.count || 0
        });
    } catch (err) {
        console.error('ADMIN REPORT ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to load report' });
    }
});

// Admin: Get all users
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [users] = await db.execute(
            `SELECT id, name, email, role, gender, created_at, updated_at, 
                    (SELECT COUNT(*) FROM channels WHERE owner_id = users.id AND deleted_at IS NULL) as channel_count,
                    (SELECT COUNT(*) FROM materials WHERE uploaded_by = users.id AND deleted_at IS NULL) as material_count
             FROM users 
             WHERE deleted_at IS NULL
             ORDER BY created_at DESC`
        );
        res.json(users);
    } catch (err) {
        console.error('ADMIN GET USERS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to get users' });
    }
});

// Admin: Delete user (soft delete to preserve referential integrity)
app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { reason } = req.body || {};
        
        // Don't allow deleting yourself
        if (req.user.id === parseInt(userId)) {
            return res.status(400).json({ error: 'Cannot delete your own account' });
        }

        // Require a deletion reason
        if (!reason || reason.trim() === '') {
            return res.status(400).json({ error: 'Deletion reason is required' });
        }

        // Soft delete user with reason
        await db.execute('UPDATE users SET deleted_at = NOW(), deleted_reason = ? WHERE id = ?', [reason, userId]);
        
        // Also soft delete their channels and materials
        await db.execute('UPDATE channels SET deleted_at = NOW() WHERE owner_id = ?', [userId]);
        await db.execute('UPDATE materials SET deleted_at = NOW() WHERE uploaded_by = ?', [userId]);
        
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        console.error('ADMIN DELETE USER ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Admin: Add/update user comment/note
app.post('/api/admin/users/:id/comment', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { comment } = req.body;
        if (!comment || comment.trim() === '') {
            return res.status(400).json({ error: 'Comment is required' });
        }

        // Fetch current warnings
        const [[current]] = await db.execute('SELECT admin_comment FROM users WHERE id = ?', [req.params.id]);
        let warnings = [];
        if (current?.admin_comment) {
            try {
                const parsed = JSON.parse(current.admin_comment);
                warnings = Array.isArray(parsed) ? parsed : [{ message: String(current.admin_comment), created_at: null }];
            } catch (_) {
                warnings = [{ message: String(current.admin_comment), created_at: null }];
            }
        }

        warnings.push({ message: comment, created_at: new Date().toISOString() });

        await db.execute(
            `UPDATE users SET admin_comment = ?, updated_at = NOW() WHERE id = ?`,
            [JSON.stringify(warnings), req.params.id]
        );
        res.json({ message: 'Comment updated', warnings });
    } catch (err) {
        console.error('ADMIN COMMENT USER ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to update comment' });
    }
});

// Admin: View teacher verification requests
app.get('/api/admin/teacher-verifications', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const status = req.query.status || 'pending';
        const [rows] = await db.execute(
            `SELECT tv.*, u.name, u.email, u.role, u.created_at as user_created_at
             FROM teacher_verifications tv
             JOIN users u ON tv.user_id = u.id
             WHERE tv.status = ?
             ORDER BY tv.created_at DESC`,
            [status]
        );
        res.json(rows);
    } catch (err) {
        console.error('ADMIN GET TEACHER VERIFICATIONS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to load teacher verifications' });
    }
});

// Admin: Approve teacher verification
app.post('/api/admin/teacher-verifications/:id/approve', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const verificationId = req.params.id;
        const [[verification]] = await db.execute('SELECT * FROM teacher_verifications WHERE id = ?', [verificationId]);
        if (!verification) return res.status(404).json({ error: 'Verification not found' });
        if (verification.status !== 'pending') return res.status(400).json({ error: 'Verification already processed' });

        await db.execute('UPDATE teacher_verifications SET status = "approved", approved_by = ?, updated_at = NOW() WHERE id = ?', [req.user.id, verificationId]);
        await db.execute('UPDATE users SET role = "teacher", updated_at = NOW() WHERE id = ?', [verification.user_id]);
        res.json({ message: 'Teacher approved' });
    } catch (err) {
        console.error('ADMIN APPROVE TEACHER ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to approve teacher' });
    }
});

// Admin: Reject teacher verification
app.post('/api/admin/teacher-verifications/:id/reject', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const verificationId = req.params.id;
        const { reason } = req.body || {};
        const [[verification]] = await db.execute('SELECT * FROM teacher_verifications WHERE id = ?', [verificationId]);
        if (!verification) return res.status(404).json({ error: 'Verification not found' });
        if (verification.status !== 'pending') return res.status(400).json({ error: 'Verification already processed' });
        if (!reason || reason.trim() === '') return res.status(400).json({ error: 'Rejection reason is required' });

        await db.execute('UPDATE teacher_verifications SET status = "rejected", reason = ?, approved_by = ?, updated_at = NOW() WHERE id = ?', [reason, req.user.id, verificationId]);
        await db.execute('UPDATE users SET role = "student", updated_at = NOW() WHERE id = ?', [verification.user_id]);
        res.json({ message: 'Teacher request rejected' });
    } catch (err) {
        console.error('ADMIN REJECT TEACHER ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to reject teacher' });
    }
});

// Admin: Get download history
app.get('/api/admin/downloads', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [downloads] = await db.execute(
            `SELECT 
                md.id,
                md.created_at as download_date,
                u.name as user_name,
                u.email as user_email,
                u.role as user_role,
                m.title as material_title,
                m.file_name as file_name,
                c.title as channel_name
             FROM material_downloads md
             JOIN users u ON md.user_id = u.id
             JOIN materials m ON md.material_id = m.id
             JOIN channels c ON m.channel_id = c.id
             ORDER BY md.created_at DESC
             LIMIT 500`
        );

        // Group downloads by date for chart
        const [downloadsByDate] = await db.execute(
            `SELECT 
                DATE(md.created_at) as date,
                COUNT(*) as count
             FROM material_downloads md
             WHERE md.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
             GROUP BY DATE(md.created_at)
             ORDER BY date ASC`
        );

        res.json({ downloads, downloadsByDate });
    } catch (err) {
        console.error('ADMIN GET DOWNLOADS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to get download history' });
    }
});

// Admin: Get all channels
app.get('/api/admin/all-channels', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [channels] = await db.execute(
            `SELECT 
                c.id,
                c.title,
                c.description,
                c.status,
                c.is_private,
                c.subscriber_count,
                c.created_at,
                u.name as teacher_name
             FROM channels c
             LEFT JOIN users u ON c.owner_id = u.id
             WHERE c.deleted_at IS NULL
             ORDER BY c.created_at DESC`
        );
        res.json(channels);
    } catch (err) {
        console.error('ADMIN GET ALL CHANNELS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to get channels' });
    }
});

// Admin: Get all materials
app.get('/api/admin/all-materials', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const [materials] = await db.execute(
            `SELECT 
                m.id,
                m.title,
                m.file_name,
                m.file_size,
                m.status,
                m.created_at,
                c.title as channel_title,
                u.name as uploader_name
             FROM materials m
             LEFT JOIN channels c ON m.channel_id = c.id
             LEFT JOIN users u ON m.uploaded_by = u.id
             WHERE m.deleted_at IS NULL
             ORDER BY m.created_at DESC`
        );
        res.json(materials);
    } catch (err) {
        console.error('ADMIN GET ALL MATERIALS ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Failed to get materials' });
    }
});

app.delete('/api/materials/:id', authenticateToken, async (req, res) => {
    try {
        const matId = req.params.id;
        const [[material]] = await db.execute('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL', [matId]);
        if (!material) return res.status(404).json({ error: 'Material not found' });

        // Permission: channel owner or uploader
        const [[channel]] = await db.execute('SELECT owner_id FROM channels WHERE id = ?', [material.channel_id]);
        const isOwner = channel && channel.owner_id === req.user.id;
        const isUploader = material.uploaded_by === req.user.id;
        if (!isOwner && !isUploader) return res.status(403).json({ error: 'Unauthorized' });

        // Delete physical file
        try {
            const filePath = path.join(__dirname, material.file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (fileErr) {
            console.error('Failed to delete file:', fileErr.message);
        }

        // Permanently delete from database
        await db.execute('DELETE FROM materials WHERE id = ?', [matId]);
        res.json({ message: 'Deleted' });
    } catch (err) {
        console.error('MATERIAL DELETE ERROR:', err.stack || err.message);
        res.status(500).json({ error: 'Delete failed', details: err.message });
    }
});

// 8. ANNOUNCEMENTS
app.post('/api/channels/:id/announcements', authenticateToken, async (req, res) => {
    try {
        const { title, message } = req.body;
        await db.execute(
            'INSERT INTO announcements (channel_id, user_id, title, message, created_at) VALUES (?, ?, ?, ?, NOW())',
            [req.params.id, req.user.id, title, message]
        );
        res.status(201).json({ message: "Posted" });
    } catch (error) { res.status(500).json({ error: 'Failed to post' }); }
});

app.get('/api/channels/:id/announcements', authenticateToken, async (req, res) => {
    const [announcements] = await db.execute(
        `SELECT a.*, u.name as creator_name FROM announcements a 
         LEFT JOIN users u ON a.user_id = u.id 
         WHERE a.channel_id = ? AND a.deleted_at IS NULL 
         ORDER BY a.created_at DESC`, 
        [req.params.id]
    );
    res.json(announcements);
});

app.get('/api/announcements/unread', authenticateToken, async (req, res) => {
    const [[unread]] = await db.execute(
        `SELECT a.*, c.title as channel_name FROM announcements a 
         JOIN channels c ON a.channel_id = c.id
         JOIN channel_user cu ON c.id = cu.channel_id
         LEFT JOIN announcement_reads ar ON a.id = ar.announcement_id AND ar.user_id = ?
         WHERE cu.user_id = ? AND ar.id IS NULL AND a.deleted_at IS NULL LIMIT 1`,
        [req.user.id, req.user.id]
    );
    res.json(unread || null);
});

app.post('/api/announcements/:id/read', authenticateToken, async (req, res) => {
    await db.execute('INSERT IGNORE INTO announcement_reads (announcement_id, user_id) VALUES (?, ?)', [req.params.id, req.user.id]);
    res.json({ message: "Read" });
});

// UPDATE ANNOUNCEMENT (only creator)
app.put('/api/announcements/:id', authenticateToken, async (req, res) => {
    try {
        const { title, message } = req.body;
        
        // Verify user is a teacher in the channel
        const [[announcement]] = await db.execute(
            'SELECT a.channel_id FROM announcements a WHERE a.id = ?',
            [req.params.id]
        );
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        // Check if user is the channel owner (teacher)
        const [[channel]] = await db.execute(
            'SELECT user_id FROM channels WHERE id = ?',
            [announcement.channel_id]
        );
        
        if (!channel || (channel.user_id !== req.user.id && req.user.role !== 'administrator')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        await db.execute(
            'UPDATE announcements SET title = ?, message = ? WHERE id = ?',
            [title, message, req.params.id]
        );
        
        res.json({ message: "Updated" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update' });
    }
});

// DELETE ANNOUNCEMENT (soft delete, only creator)
app.delete('/api/announcements/:id', authenticateToken, async (req, res) => {
    try {
        // Verify user is a teacher in the channel
        const [[announcement]] = await db.execute(
            'SELECT a.channel_id FROM announcements a WHERE a.id = ?',
            [req.params.id]
        );
        
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        // Check if user is the channel owner (teacher)
        const [[channel]] = await db.execute(
            'SELECT user_id FROM channels WHERE id = ?',
            [announcement.channel_id]
        );
        
        if (!channel || (channel.user_id !== req.user.id && req.user.role !== 'administrator')) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        // Soft delete
        await db.execute(
            'UPDATE announcements SET deleted_at = NOW() WHERE id = ?',
            [req.params.id]
        );
        
        res.json({ message: "Deleted" });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete' });
    }
});

createConnection().then(() => app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`)));