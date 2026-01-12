import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

async function addDeletedAtColumn() {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'eduarchive',
        });

        console.log('🔄 Adding deleted_at column to users table...');
        
        try {
            await db.execute(`
                ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
            `);
            console.log('✅ deleted_at column added to users table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  deleted_at column already exists');
            } else {
                throw err;
            }
        }

        console.log('\n🔄 Adding deleted_at column to channels table...');
        try {
            await db.execute(`
                ALTER TABLE channels ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
            `);
            console.log('✅ deleted_at column added to channels table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  deleted_at column already exists');
            } else {
                throw err;
            }
        }

        console.log('\n🔄 Adding deleted_at column to materials table...');
        try {
            await db.execute(`
                ALTER TABLE materials ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
            `);
            console.log('✅ deleted_at column added to materials table');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️  deleted_at column already exists');
            } else {
                throw err;
            }
        }

        console.log('\n✅ Migration complete!');
        await db.end();
    } catch (err) {
        console.error('❌ Migration error:', err.message);
        process.exit(1);
    }
}

addDeletedAtColumn();
