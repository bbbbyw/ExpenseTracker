const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const messageQueue = require('./config/messageQueue');
const consumer = require('./consumers/expense.consumer');
const db = require('./config/database');
const routes = require('./routes/report.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'report-service' });
});
app.use('/api/v1/reports', routes);

const start = async () => {
    await db.initialize();
    await messageQueue.connect();
    await consumer.start();
    app.listen(PORT, () => {
        console.log(`Report Service running on port ${PORT}`);
    });
};

start().catch((e) => {
    console.error('Report Service failed to start', e);
    process.exit(1);
});

