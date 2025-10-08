const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const authRoutes = require('./routes/auth.routes');
const { errorHandler } = require('./middleware/error.middleware');
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'auth-service' });
});

app.use('/api/v1/auth', authRoutes);
app.use(errorHandler);

const startServer = async () => {
    try {
        await db.initialize();
        app.listen(PORT, () => {
            console.log(`Auth Service running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
module.exports = app;

