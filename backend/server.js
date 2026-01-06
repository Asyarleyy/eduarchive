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

// Ensure directories exist
const dirs = ['uploads/materials', 'uploads/profile'];
dirs.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
});

// 2. MULTER CONFIGURATIONS (Defined only ONCE at the top)
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
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token required' });
    jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// 5. ROUTES

// Unified Register (Fixed 500 error)
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
        const [[newUser]] = await db.execute("SELECT id, name, email, role, profile_image, first_name, last_name, school, gender, birth_date FROM users WHERE id = ?", [result.insertId]);
        res.status(201).json({ token, user: newUser });
    } catch (error) { res.status(500).json({ error: 'Register failed' }); }
});

// Login
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

// Profile Update (Unified)
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

        const [[updated]] = await db.execute("SELECT id, first_name, last_name, name, email, role, school, gender, birth_date, profile_image FROM users WHERE id=?", [req.user.id]);
        res.json({ user: updated });
    } catch (err) { res.status(500).json({ error: "Update failed" }); }
});

// Get User
app.get('/api/user', authenticateToken, async (req, res) => {
    const [[user]] = await db.execute('SELECT id, first_name, last_name, name, email, role, school, gender, birth_date, profile_image FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
});

// (Add your Channels, Materials, and Announcements routes here...)

createConnection().then(() => app.listen(PORT, () => console.log(`🚀 http://localhost:${PORT}`)));