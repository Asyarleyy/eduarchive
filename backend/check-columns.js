import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

(async () => {
    try {
        const db = await mysql.createConnection({
            host: process.env.DB_HOST || '127.0.0.1',
            port: process.env.DB_PORT || 3306,
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'eduarchive',
        });

        const [columns] = await db.execute('SHOW COLUMNS FROM users');
        
        console.log('✅ Users table columns:');
        columns.forEach(col => {
            console.log(`  - ${col.Field} (${col.Type})`);
        });
        
        // Check if deleted_reason column exists
        const hasDeletedReason = columns.some(col => col.Field === 'deleted_reason');
        console.log(`\n${hasDeletedReason ? '✅' : '❌'} deleted_reason column: ${hasDeletedReason ? 'EXISTS' : 'MISSING'}`);
        
        const hasDeletedAt = columns.some(col => col.Field === 'deleted_at');
        console.log(`${hasDeletedAt ? '✅' : '❌'} deleted_at column: ${hasDeletedAt ? 'EXISTS' : 'MISSING'}`);
        
        await db.end();
    } catch (err) {
        console.error('Error:', err.message);
    }
})();
