const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

const initialize = async () => {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS generated_reports (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                report_type VARCHAR(50) NOT NULL,
                report_data JSONB NOT NULL,
                start_date DATE,
                end_date DATE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP
            );
        `);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_user_date ON generated_reports(user_id, start_date, end_date);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_reports_type ON generated_reports(report_type);`);
        console.log('Report DB initialized');
    } finally {
        client.release();
    }
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    initialize,
    pool
};

