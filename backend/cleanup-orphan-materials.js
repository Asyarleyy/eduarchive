import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), 'backend', '.env') });

async function main() {
  const DB_PORT = process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306;
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: DB_PORT,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'eduarchive_db',
  });

  try {
    console.log('Connected to DB');

    const [rows] = await connection.execute(
      `SELECT id, file_path FROM materials WHERE uploaded_by IS NULL OR uploaded_by NOT IN (SELECT id FROM users)`
    );

    if (!rows || rows.length === 0) {
      console.log('No orphan materials found.');
      await connection.end();
      return;
    }

    const ids = rows.map(r => r.id);
    console.log(`Found ${ids.length} orphan materials.`);

    // Delete download logs first (best-effort)
    try {
      await connection.execute(
        `DELETE FROM material_downloads WHERE material_id IN (${ids.map(() => '?').join(',')})`,
        ids
      );
      console.log('Deleted related download logs.');
    } catch (e) {
      console.warn('Skipping download log deletion:', e.message);
    }

    // Delete files from disk
    let deletedFiles = 0;
    for (const r of rows) {
      try {
        if (r.file_path) {
          const fileAbs = path.resolve(path.join(process.cwd(), 'backend'), '.' + r.file_path);
          if (fs.existsSync(fileAbs)) {
            fs.unlinkSync(fileAbs);
            deletedFiles++;
          }
        }
      } catch (e) {
        console.warn(`Failed deleting file for material ${r.id}:`, e.message);
      }
    }
    console.log(`Deleted ${deletedFiles} files from disk.`);

    // Delete materials rows
    await connection.execute(
      `DELETE FROM materials WHERE id IN (${ids.map(() => '?').join(',')})`,
      ids
    );

    console.log(`Deleted ${ids.length} materials from database.`);
  } catch (err) {
    console.error('Cleanup error:', err.message || err);
  } finally {
    await connection.end();
  }
}

main();
