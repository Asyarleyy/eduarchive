import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const addAdminComment = async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'eduarchive_db',
        });
        
        console.log('✅ Connected to MySQL');

        // Check if column already exists
        const [columns] = await db.execute(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
             WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'admin_comment'`,
            [process.env.DB_NAME || 'eduarchive_db']
        );

        if (columns.length > 0) {
            console.log('ℹ️  Column admin_comment already exists');
        } else {
            await db.execute('ALTER TABLE users ADD COLUMN admin_comment TEXT DEFAULT NULL');
            console.log('✅ Column admin_comment added successfully');
        }

        await db.end();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

addAdminComment();
