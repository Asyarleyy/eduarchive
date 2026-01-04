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

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads', 'materials');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|ppt|pptx|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG are allowed.'));
    }
  }
});

// Database connection
let db;
const createConnection = async () => {
  try {
    // Parse port as integer (important: .env values are strings)
    const dbPort = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
    
    console.log('🔌 Connecting to MySQL...');
    console.log(`   Host: ${process.env.DB_HOST || '127.0.0.1'}`);
    console.log(`   Port: ${dbPort}`);
    console.log(`   Database: ${process.env.DB_NAME || 'eduarchive_db'}\n`);
    
    db = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      port: dbPort,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'eduarchive_db',
    });
    console.log('✅ Connected to MySQL database');
  } catch (error) {
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
};

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Auth Routes
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password, role = 'student', school } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check if user exists
    const [existing] = await db.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO users (name, email, password, role, school, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())',
      [name, email, hashedPassword, role, school || null]
    );

    // Generate token
    const token = jwt.sign(
      { id: result.insertId, email, role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: { id: result.insertId, name, email, role, school: school || null }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        school: user.school
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    const [users] = await db.execute('SELECT id, name, email, role, school FROM users WHERE id = ?', [req.user.id]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const user = users[0];
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Channel Routes
app.get('/api/channels', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'teacher') {
      const [channels] = await db.execute(
        'SELECT * FROM channels WHERE owner_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
        [req.user.id]
      );
      res.json(channels);
    } else {
      res.status(403).json({ error: 'Only teachers can view their channels' });
    }
  } catch (error) {
    console.error('Get channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/channels/joined', authenticateToken, async (req, res) => {
  try {
    const [channels] = await db.execute(
      `SELECT c.* FROM channels c
       INNER JOIN channel_user cu ON c.id = cu.channel_id
       WHERE cu.user_id = ? AND c.deleted_at IS NULL
       ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    res.json(channels);
  } catch (error) {
    console.error('Get joined channels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/channels', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ error: 'Only teachers can create channels' });
    }

    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Channel name is required' });
    }

    // Generate slug
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let uniqueSlug = slug;
    let counter = 1;

    // Ensure slug is unique
    while (true) {
      const [existing] = await db.execute('SELECT id FROM channels WHERE slug = ?', [uniqueSlug]);
      if (existing.length === 0) break;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }

    // Generate access code
    const accessCode = Math.random().toString(36).substring(2, 12).toUpperCase();

    const [result] = await db.execute(
      `INSERT INTO channels (owner_id, title, slug, description, access_code, is_public, subscriber_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, NOW(), NOW())`,
      [req.user.id, name, uniqueSlug, description || null, accessCode]
    );

    const [channel] = await db.execute('SELECT * FROM channels WHERE id = ?', [result.insertId]);
    res.status(201).json(channel[0]);
  } catch (error) {
    console.error('Create channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/channels/:id', authenticateToken, async (req, res) => {
  try {
    const [channels] = await db.execute('SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL', [req.params.id]);
    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];

    // Check access
    if (channel.owner_id !== req.user.id) {
      const [members] = await db.execute('SELECT * FROM channel_user WHERE channel_id = ? AND user_id = ?', [req.params.id, req.user.id]);
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get materials
    const [materials] = await db.execute(
      'SELECT * FROM materials WHERE channel_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [req.params.id]
    );

    channel.materials = materials;
    res.json(channel);
  } catch (error) {
    console.error('Get channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/channels/join', authenticateToken, async (req, res) => {
  try {
    const { invite_code } = req.body;
    if (!invite_code) {
      return res.status(400).json({ error: 'Access code is required' });
    }

    const [channels] = await db.execute('SELECT * FROM channels WHERE access_code = ? AND deleted_at IS NULL', [invite_code]);
    if (channels.length === 0) {
      return res.status(404).json({ error: 'Invalid access code' });
    }

    const channel = channels[0];

    // Check if already joined
    const [existing] = await db.execute('SELECT * FROM channel_user WHERE channel_id = ? AND user_id = ?', [channel.id, req.user.id]);
    if (existing.length > 0) {
      return res.json({ message: 'Already joined this channel', channel });
    }

    // Join channel
    await db.execute(
      'INSERT INTO channel_user (channel_id, user_id, role, joined_at, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW(), NOW())',
      [channel.id, req.user.id, 'member']
    );

    // Increment subscriber count
    await db.execute('UPDATE channels SET subscriber_count = subscriber_count + 1 WHERE id = ?', [channel.id]);

    res.json({ message: 'Successfully joined channel', channel });
  } catch (error) {
    console.error('Join channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Material Routes
app.get('/api/channels/:id/materials', authenticateToken, async (req, res) => {
  try {
    const channelId = req.params.id;

    // Check access
    const [channels] = await db.execute('SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];
    if (channel.owner_id !== req.user.id) {
      const [members] = await db.execute('SELECT * FROM channel_user WHERE channel_id = ? AND user_id = ?', [channelId, req.user.id]);
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [materials] = await db.execute(
      'SELECT * FROM materials WHERE channel_id = ? AND deleted_at IS NULL ORDER BY created_at DESC',
      [channelId]
    );

    res.json(materials);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/channels/:id/materials', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    const channelId = req.params.id;

    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }

    // Check if user is channel owner
    const [channels] = await db.execute('SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL', [channelId]);
    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];
    if (channel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only channel owner can upload materials' });
    }

    const { title, description, subject_id, level, year } = req.body;

    const filePath = `/uploads/materials/${req.file.filename}`;
    const fileSize = req.file.size;
    const fileMime = req.file.mimetype;

    const [result] = await db.execute(
      `INSERT INTO materials (channel_id, uploaded_by, subject_id, title, description, file_path, file_name, file_mime, file_size, level, year, is_public, is_approved, download_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 0, 0, NOW(), NOW())`,
      [channelId, req.user.id, subject_id || null, title, description || null, filePath, req.file.originalname, fileMime, fileSize, level || null, year || null]
    );

    const [material] = await db.execute('SELECT * FROM materials WHERE id = ?', [result.insertId]);
    res.status(201).json(material[0]);
  } catch (error) {
    console.error('Upload material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/channels/:id/members', authenticateToken, async (req, res) => {
  try {
    const channelId = req.params.id;

    const [channels] = await db.execute(
      'SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL',
      [channelId]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];

    if (channel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can view members' });
    }

    const [members] = await db.execute(
  `SELECT users.id, users.name, users.email, cu.joined_at
   FROM channel_user cu
   JOIN users ON cu.user_id = users.id
   WHERE cu.channel_id = ? AND users.id != ?`,
  [channelId, channel.owner_id]
);


    res.json(members);

  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/channels/:id/members/:userId', authenticateToken, async (req, res) => {
  try {
    const channelId = req.params.id;
    const userId = req.params.userId;

    const [channels] = await db.execute(
      'SELECT * FROM channels WHERE id = ?',
      [channelId]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];

    if (channel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only owner can remove students' });
    }

    await db.execute(
      'DELETE FROM channel_user WHERE channel_id = ? AND user_id = ?',
      [channelId, userId]
    );

    await db.execute(
      'UPDATE channels SET subscriber_count = subscriber_count - 1 WHERE id = ?',
      [channelId]
    );

    res.json({ message: 'Student removed successfully' });

  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/channels/:id', authenticateToken, async (req, res) => {
  try {
    const channelId = req.params.id;

    const [channels] = await db.execute(
      'SELECT * FROM channels WHERE id = ?',
      [channelId]
    );

    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];

    if (channel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only channel owner can delete channel' });
    }

    await db.execute(
      'UPDATE channels SET deleted_at = NOW() WHERE id = ?',
      [channelId]
    );

    res.json({ message: 'Channel deleted successfully' });

  } catch (error) {
    console.error('Delete channel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


app.get('/api/materials/:id/download', authenticateToken, async (req, res) => {
  try {
    const materialId = req.params.id;

    const [materials] = await db.execute('SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL', [materialId]);
    if (materials.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materials[0];

    // Check access
    const [channels] = await db.execute('SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL', [material.channel_id]);
    if (channels.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const channel = channels[0];
    if (channel.owner_id !== req.user.id) {
      const [members] = await db.execute('SELECT * FROM channel_user WHERE channel_id = ? AND user_id = ?', [material.channel_id, req.user.id]);
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Increment download count
    await db.execute('UPDATE materials SET download_count = download_count + 1 WHERE id = ?', [materialId]);

    // Record download
    await db.execute(
      'INSERT INTO downloads (material_id, user_id, ip, user_agent, downloaded_at, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())',
      [materialId, req.user.id, req.ip, req.get('user-agent')]
    );

    const filePath = path.join(__dirname, material.file_path);
    res.download(filePath, material.file_name);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/materials/:id/preview', authenticateToken, async (req, res) => {
  try {
    const materialId = req.params.id;

    const [materials] = await db.execute(
      "SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL",
      [materialId]
    );

    if (materials.length === 0)
      return res.status(404).json({ error: "Material not found" });

    const material = materials[0];

    // Check access
    const [channels] = await db.execute(
      "SELECT * FROM channels WHERE id = ? AND deleted_at IS NULL",
      [material.channel_id]
    );

    const channel = channels[0];

    if (channel.owner_id !== req.user.id) {
      const [member] = await db.execute(
        "SELECT * FROM channel_user WHERE channel_id = ? AND user_id = ?",
        [material.channel_id, req.user.id]
      );

      if (member.length === 0)
        return res.status(403).json({ error: "Access denied" });
    }

    const filePath = path.join(__dirname, material.file_path);
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Type", material.file_mime);

    res.sendFile(filePath);

  } catch (err) {
    console.error("Preview error:", err);
    res.status(500).json({ error: "Preview failed" });
  }
});


app.delete('/api/materials/:id', authenticateToken, async (req, res) => {
  try {
    const materialId = req.params.id;

    const [materials] = await db.execute(
      'SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL',
      [materialId]
    );

    if (materials.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materials[0];

    // check owner
    const [channels] = await db.execute(
      'SELECT * FROM channels WHERE id = ?',
      [material.channel_id]
    );

    const channel = channels[0];

    if (channel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only channel owner can delete materials' });
    }

    // Soft delete
    await db.execute(
      'UPDATE materials SET deleted_at = NOW() WHERE id = ?',
      [materialId]
    );

    res.json({ message: 'Material deleted successfully' });

  } catch (error) {
    console.error('Delete material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/materials/:id', authenticateToken, async (req, res) => {
  try {
    const materialId = req.params.id;
    const { title, description } = req.body;

    const [materials] = await db.execute(
      'SELECT * FROM materials WHERE id = ? AND deleted_at IS NULL',
      [materialId]
    );

    if (materials.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = materials[0];

    const [channels] = await db.execute(
      'SELECT * FROM channels WHERE id = ?',
      [material.channel_id]
    );

    const channel = channels[0];

    if (channel.owner_id !== req.user.id) {
      return res.status(403).json({ error: 'Only channel owner can edit materials' });
    }

    await db.execute(
      `UPDATE materials 
       SET title = ?, description = ?, updated_at = NOW() 
       WHERE id = ?`,
      [title, description || null, materialId]
    );

    res.json({ message: 'Material updated successfully' });

  } catch (error) {
    console.error('Update material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// Start server
createConnection().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});

