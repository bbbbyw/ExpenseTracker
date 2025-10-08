const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const db = require('./config/database');
const routes = require('./routes/category.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'category-service' });
});
app.use('/api/v1/categories', routes);

const start = async () => {
    await db.initialize();
    app.listen(PORT, () => {
        console.log(`Category Service running on port ${PORT}`);
    });
};

start().catch((e) => {
    console.error('Category Service failed to start', e);
    process.exit(1);
});

