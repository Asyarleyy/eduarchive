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
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const dirs = ['uploads/materials', 'uploads/profile'];
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
    } catch (error) {
        console.error('❌ DB Error:', error);
        process.exit(1);
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

// 5. AUTH & USER ROUTES
app.post('/api/register', uploadProfile.single('image'), async (req, res) => {
    try {
        const { name, first_name, last_name, email, password, role, school, gender, birth_date } = req.body;
        const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) return res.status(400).json({ error: 'Email already registered' });

        const imagePath = req.file ? `/uploads/profile/${req.file.filename}` : null;
        const hashedPassword = await bcrypt.hash(password, 10);
        const [result] = await db.execute(
            `INSERT INTO users (name, first_name, last_name, email, password, role, school, gender, birth_date, profile_image, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [name, first_name || null, last_name || null, email, hashedPassword, role, school || null, gender || null, birth_date || null, imagePath]
        );

        const token = jwt.sign({ id: result.insertId, email, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        const [[newUser]] = await db.execute("SELECT id, name, email, role, profile_image FROM users WHERE id = ?", [result.insertId]);
        res.status(201).json({ token, user: newUser });
    } catch (error) { res.status(500).json({ error: 'Register failed' }); }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
        const user = users[0];
        if (!user || !await bcrypt.compare(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });
        const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
        res.json({ token, user });
    } catch (error) { res.status(500).json({ error: 'Login error' }); }
});

app.get('/api/user', authenticateToken, async (req, res) => {
    const [[user]] = await db.execute('SELECT id, name, email, role, profile_image, first_name, last_name, school, gender, birth_date FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
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

// 6. CHANNEL ROUTES
app.post('/api/channels', authenticateToken, async (req, res) => {
    try {
      if (req.user.role !== 'teacher') return res.status(403).json({ error: 'Only teachers can create channels' });
      const { name, description } = req.body;
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const accessCode = Math.random().toString(36).substring(2, 12).toUpperCase();
      const [result] = await db.execute(
        `INSERT INTO channels (owner_id, title, slug, description, access_code, subscriber_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, NOW(), NOW())`,
        [req.user.id, name, slug, description || null, accessCode]
      );
      const [[newChannel]] = await db.execute('SELECT * FROM channels WHERE id = ?', [result.insertId]);
      res.status(201).json(newChannel);
    } catch (error) { res.status(500).json({ error: 'Failed to create channel' }); }
});

app.get('/api/channels', authenticateToken, async (req, res) => {
    try {
      let query = req.user.role === 'teacher' 
        ? 'SELECT * FROM channels WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC'
        : 'SELECT c.* FROM channels c INNER JOIN channel_user cu ON c.id = cu.channel_id WHERE cu.user_id = ? AND c.deleted_at IS NULL ORDER BY c.created_at DESC';
      const [channels] = await db.execute(query, [req.user.id]);
      res.json(channels);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch channels' }); }
});

app.get('/api/channels/joined', authenticateToken, async (req, res) => {
    try {
        const [channels] = await db.execute(
            `SELECT c.* FROM channels c 
             JOIN channel_user cu ON c.id = cu.channel_id 
             WHERE cu.user_id = ? AND c.deleted_at IS NULL`, 
            [req.user.id]
        );
        res.json(channels);
    } catch (error) { res.status(500).json({ error: 'Failed to fetch joined channels' }); }
});

app.get('/api/channels/:id', authenticateToken, async (req, res) => {
    const [[channel]] = await db.execute('SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    res.json(channel);
});

app.post('/api/channels/join', authenticateToken, async (req, res) => {
    try {
      const { invite_code } = req.body;
      const [[channel]] = await db.execute('SELECT id FROM channels WHERE access_code = ? AND deleted_at IS NULL', [invite_code]);
      if (!channel) return res.status(404).json({ error: 'Invalid access code' });
      await db.execute('INSERT INTO channel_user (channel_id, user_id, joined_at, created_at, updated_at) VALUES (?, ?, NOW(), NOW(), NOW())', [channel.id, req.user.id]);
      await db.execute('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?', [channel.id]);
      res.json({ message: 'Joined successfully' });
    } catch (err) { res.status(500).json({ error: "Join failed" }); }
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
            (channel_id, uploaded_by, title, description, file_path, file_name, file_mime, file_size, is_public, is_approved, created_at, updated_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())`,
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
    const [materials] = await db.execute('SELECT * FROM materials WHERE channel_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.id]);
    res.json(materials);
});

app.get('/api/materials/:id/download', authenticateToken, async (req, res) => {
    try {
        const [[file]] = await db.execute('SELECT file_path, file_name FROM materials WHERE id = ?', [req.params.id]);
        if (!file) return res.status(404).json({ error: 'File not found' });
        res.download(path.join(__dirname, file.file_path), file.file_name);
    } catch (error) { res.status(500).json({ error: 'Download failed' }); }
});

app.get('/api/materials/:id/preview', authenticateToken, async (req, res) => {
    try {
        const [[file]] = await db.execute('SELECT file_path FROM materials WHERE id = ?', [req.params.id]);
        if (!file) return res.status(404).json({ error: 'File not found' });
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

// Delete material (soft delete)
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

        await db.execute('UPDATE materials SET deleted_at = NOW() WHERE id = ?', [matId]);
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
    const [announcements] = await db.execute('SELECT * FROM announcements WHERE channel_id = ? AND deleted_at IS NULL ORDER BY created_at DESC', [req.params.id]);
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

createConnection().then(() => app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`)));