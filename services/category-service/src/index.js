const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/database');
const routes = require('./routes/category.routes');
const { register, metricsMiddleware } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics middleware
app.use(metricsMiddleware('category-service'));

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (error) {
        res.status(500).end(error);
    }
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'category-service' });
});
app.use('/api/v1/categories', routes);

const start = async () => {
    await db.initialize();
    const server = app.listen(PORT, () => {
        console.log(`Category Service running on port ${PORT}`);
    });
    return server;
};

if (require.main === module) {
    start().catch((e) => {
        console.error('Category Service failed to start', e);
        process.exit(1);
    });
}

module.exports = { app, start };

