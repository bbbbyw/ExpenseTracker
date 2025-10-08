const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const DEFAULT_CATEGORIES = [
    { name: 'Food & Dining', color: '#FF6B6B', icon: '🍔' },
    { name: 'Transportation', color: '#4ECDC4', icon: '🚗' },
    { name: 'Shopping', color: '#45B7D1', icon: '🛍️' },
    { name: 'Bills & Utilities', color: '#FFA07A', icon: '📄' },
    { name: 'Entertainment', color: '#98D8C8', icon: '🎬' },
    { name: 'Healthcare', color: '#F7DC6F', icon: '⚕️' },
    { name: 'Other', color: '#95A5A6', icon: '📌' }
];

const initialize = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                user_id INTEGER,
                name VARCHAR(100) NOT NULL,
                color VARCHAR(7),
                icon VARCHAR(50),
                monthly_budget DECIMAL(10, 2),
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id);`);

        const { rows } = await client.query('SELECT COUNT(*)::int AS c FROM categories WHERE is_default = true');
        if (rows[0].c === 0) {
            for (const cat of DEFAULT_CATEGORIES) {
                await client.query(
                    `INSERT INTO categories (user_id, name, color, icon, is_default) VALUES ($1, $2, $3, $4, $5)`,
                    [null, cat.name, cat.color, cat.icon, true]
                );
            }
            console.log('Seeded default categories');
        }

        console.log('Category DB initialized');
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initialize,
    pool
};

