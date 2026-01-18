const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const expenseRoutes = require('./routes/expense.routes');
const { errorHandler } = require('./middleware/error.middleware');
const db = require('./config/database');
const mq = require('./config/messageQueue');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'healthy', service: 'expense-service' });
});
app.use('/api/v1/expenses', expenseRoutes);
app.use(errorHandler);

const start = async () => {
    await db.initialize();
    await mq.connect();
    app.listen(PORT, () => {
        console.log(`Expense Service running on port ${PORT}`);
    });
};

start().catch((e) => {
    console.error('Expense Service failed to start', e);
    process.exit(1);
});

