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

const initialize = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS expenses (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                category_id INTEGER NOT NULL,
                amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
                description TEXT,
                expense_date DATE NOT NULL,
                receipt_url VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, expense_date);`);

        console.log('Expense DB initialized');
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initialize,
    pool
};

