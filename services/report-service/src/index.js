const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const messageQueue = require('./config/messageQueue');
const consumer = require('./consumers/expense.consumer');
const db = require('./config/database');
const routes = require('./routes/report.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { register, metricsMiddleware } = require('./utils/metrics');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Metrics middleware
app.use(metricsMiddleware('report-service'));

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
    res.status(200).json({ status: 'healthy', service: 'report-service' });
});
app.use('/api/v1/reports', routes);
app.use(errorHandler);

const start = async () => {
    await db.initialize();
    await messageQueue.connect();
    await consumer.start();
    const server = app.listen(PORT, () => {
        console.log(`Report Service running on port ${PORT}`);
    });
    return server;
};

if (require.main === module) {
    start().catch((e) => {
        console.error('Report Service failed to start', e);
        process.exit(1);
    });
}

module.exports = { app, start };

