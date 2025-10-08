const db = require('../config/database');
const redis = require('../config/redis');
const axios = require('axios');

const oneDayMs = 24 * 60 * 60 * 1000;

function getMonthRange(year, month) {
    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0));
    const s = start.toISOString().slice(0, 10);
    const e = end.toISOString().slice(0, 10);
    return { start: s, end: e };
}

class ReportController {
    async monthly(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { year, month } = req.query;
            const { start, end } = getMonthRange(Number(year), Number(month));

            const cacheKey = `reports:monthly:${userId}:${year}-${month}`;
            const cached = await redis.get(cacheKey);
            if (cached) return res.json(JSON.parse(cached));

            const statsResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses/stats`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate: start, endDate: end }
            });

            const byCategoryResp = await db.query(
                `SELECT category_id, COALESCE(SUM(amount),0)::float AS amount
                 FROM expenses
                 WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
                 GROUP BY category_id
                 ORDER BY amount DESC`,
                [userId, start, end]
            ).catch(() => ({ rows: [] }));

            const data = {
                totalSpent: statsResp.data.totalAmount,
                expenseCount: statsResp.data.totalExpenses,
                byCategory: byCategoryResp.rows
            };

            await redis.setEx(cacheKey, 3600, JSON.stringify(data));
            await db.query(
                `INSERT INTO generated_reports (user_id, report_type, report_data, start_date, end_date, expires_at)
                 VALUES ($1, $2, $3, $4, $5, NOW() + INTERVAL '1 day')`,
                [userId, 'monthly', data, start, end]
            );
            res.json(data);
        } catch (error) { next(error); }
    }

    async byCategory(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate } = req.query;
            const { rows } = await db.query(
                `SELECT category_id, COALESCE(SUM(amount),0)::float AS amount
                 FROM expenses WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
                 GROUP BY category_id ORDER BY amount DESC`,
                [userId, startDate, endDate]
            ).catch(() => ({ rows: [] }));
            const total = rows.reduce((a, r) => a + Number(r.amount), 0) || 1;
            const categories = rows.map(r => ({ categoryId: r.category_id, amount: Number(r.amount), percentage: Number(((r.amount / total) * 100).toFixed(2)) }));
            res.json({ categories });
        } catch (error) { next(error); }
    }

    async trend(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate, interval = 'monthly' } = req.query;
            let dateTrunc = 'month';
            if (interval === 'daily') dateTrunc = 'day';
            if (interval === 'weekly') dateTrunc = 'week';
            const { rows } = await db.query(
                `SELECT date_trunc('${dateTrunc}', expense_date) as bucket, COALESCE(SUM(amount),0)::float AS amount
                 FROM expenses WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
                 GROUP BY bucket ORDER BY bucket`,
                [userId, startDate, endDate]
            ).catch(() => ({ rows: [] }));
            const data = rows.map(r => ({ date: new Date(r.bucket).toISOString().slice(0,10), amount: Number(r.amount) }));
            res.json({ data });
        } catch (error) { next(error); }
    }

    async export(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate } = req.body;
            const { rows } = await db.query(
                `SELECT id, category_id, amount, description, expense_date
                 FROM expenses WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
                 ORDER BY expense_date DESC`,
                [userId, startDate, endDate]
            ).catch(() => ({ rows: [] }));

            const header = 'id,categoryId,amount,description,expenseDate\n';
            const body = rows.map(r => `${r.id},${r.category_id},${r.amount},"${(r.description||'').replace(/"/g,'""')}",${r.expense_date.toISOString().slice(0,10)}`).join('\n');
            const csv = header + body + '\n';
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename="expenses.csv"');
            res.send(csv);
        } catch (error) { next(error); }
    }

    async dashboard(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const now = new Date();
            const { start, end } = getMonthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);
            const cacheKey = `reports:dashboard:${userId}`;
            const cached = await redis.get(cacheKey);
            if (cached) return res.json(JSON.parse(cached));

            const statsResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses/stats`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate: start, endDate: end }
            });
            const currentMonth = { spent: statsResp.data.totalAmount, expenseCount: statsResp.data.totalExpenses };

            const topCategories = await db.query(
                `SELECT category_id, COALESCE(SUM(amount),0)::float AS amount
                 FROM expenses WHERE user_id = $1 AND expense_date BETWEEN $2 AND $3
                 GROUP BY category_id ORDER BY amount DESC LIMIT 5`,
                [userId, start, end]
            ).then(r => r.rows);

            const recentExpenses = await db.query(
                `SELECT id, category_id, amount, description, expense_date
                 FROM expenses WHERE user_id = $1
                 ORDER BY expense_date DESC LIMIT 10`,
                [userId]
            ).then(r => r.rows);

            const last6Start = new Date(now.getUTCFullYear(), now.getUTCMonth() - 5, 1).toISOString().slice(0,10);
            const monthlyTrendRows = await db.query(
                `SELECT date_trunc('month', expense_date) as bucket, COALESCE(SUM(amount),0)::float AS amount
                 FROM expenses WHERE user_id = $1 AND expense_date >= $2
                 GROUP BY bucket ORDER BY bucket`,
                [userId, last6Start]
            ).then(r => r.rows);
            const monthlyTrend = monthlyTrendRows.map(r => ({ date: new Date(r.bucket).toISOString().slice(0,10), amount: Number(r.amount) }));

            const data = { currentMonth, topCategories, recentExpenses, monthlyTrend };
            await redis.setEx(cacheKey, 600, JSON.stringify(data));
            res.json(data);
        } catch (error) { next(error); }
    }
}

module.exports = new ReportController();

