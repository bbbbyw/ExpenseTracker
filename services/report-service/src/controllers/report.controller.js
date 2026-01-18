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

            // Get expenses from Expense Service API
            const expensesResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate: start, endDate: end }
            }).catch(() => ({ data: { expenses: [] } }));

            // Group by category
            const byCategoryMap = {};
            expensesResp.data.expenses?.forEach(exp => {
                const catId = exp.category_id;
                if (!byCategoryMap[catId]) {
                    byCategoryMap[catId] = { category_id: catId, amount: 0 };
                }
                byCategoryMap[catId].amount += Number(exp.amount);
            });
            const byCategoryResp = { rows: Object.values(byCategoryMap).sort((a, b) => b.amount - a.amount) };

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
            
            // Get expenses from Expense Service API
            const expensesResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate, endDate }
            }).catch(() => ({ data: { expenses: [] } }));

            // Group by category
            const categoryMap = {};
            expensesResp.data.expenses?.forEach(exp => {
                const catId = exp.category_id;
                if (!categoryMap[catId]) {
                    categoryMap[catId] = { categoryId: catId, amount: 0 };
                }
                categoryMap[catId].amount += Number(exp.amount);
            });

            const rows = Object.values(categoryMap).sort((a, b) => b.amount - a.amount);
            const total = rows.reduce((a, r) => a + Number(r.amount), 0) || 1;
            const categories = rows.map(r => ({ categoryId: r.categoryId, amount: Number(r.amount), percentage: Number(((r.amount / total) * 100).toFixed(2)) }));
            res.json({ categories });
        } catch (error) { next(error); }
    }

    async trend(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate, interval = 'monthly' } = req.query;
            
            // Get expenses from Expense Service API
            const expensesResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate, endDate }
            }).catch(() => ({ data: { expenses: [] } }));

            // Group by interval
            const bucketMap = {};
            expensesResp.data.expenses?.forEach(exp => {
                const date = new Date(exp.expense_date);
                let bucket;
                if (interval === 'daily') {
                    bucket = date.toISOString().slice(0, 10);
                } else if (interval === 'weekly') {
                    const weekStart = new Date(date);
                    weekStart.setDate(date.getDate() - date.getDay());
                    bucket = weekStart.toISOString().slice(0, 10);
                } else {
                    bucket = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                }
                
                if (!bucketMap[bucket]) {
                    bucketMap[bucket] = { date: bucket, amount: 0 };
                }
                bucketMap[bucket].amount += Number(exp.amount);
            });

            const data = Object.values(bucketMap).sort((a, b) => a.date.localeCompare(b.date));
            res.json({ data });
        } catch (error) { next(error); }
    }

    async export(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate } = req.body;
            
            // Get expenses from Expense Service API
            const expensesResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate, endDate }
            }).catch(() => ({ data: { expenses: [] } }));

            const rows = expensesResp.data.expenses || [];
            const header = 'id,categoryId,amount,description,expenseDate\n';
            const body = rows.map(r => {
                const date = r.expense_date instanceof Date ? r.expense_date.toISOString().slice(0,10) : r.expense_date;
                return `${r.id},${r.category_id},${r.amount},"${(r.description||'').replace(/"/g,'""')}",${date}`;
            }).join('\n');
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

            // Get current month expenses
            const currentMonthExpenses = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses`, {
                headers: { Authorization: req.headers.authorization },
                params: { startDate: start, endDate: end }
            }).catch(() => ({ data: { expenses: [] } }));

            // Get all expenses for recent and trend
            const allExpensesResp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses`, {
                headers: { Authorization: req.headers.authorization }
            }).catch(() => ({ data: { expenses: [] } }));

            const allExpenses = allExpensesResp.data.expenses || [];
            const currentMonthExp = currentMonthExpenses.data.expenses || [];

            // Top categories (current month)
            const categoryMap = {};
            currentMonthExp.forEach(exp => {
                const catId = exp.category_id;
                if (!categoryMap[catId]) {
                    categoryMap[catId] = { category_id: catId, amount: 0 };
                }
                categoryMap[catId].amount += Number(exp.amount);
            });
            const topCategories = Object.values(categoryMap)
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5);

            // Recent expenses (all time, sorted by date)
            const recentExpenses = allExpenses
                .sort((a, b) => new Date(b.expense_date) - new Date(a.expense_date))
                .slice(0, 10)
                .map(exp => ({
                    id: exp.id,
                    category_id: exp.category_id,
                    amount: exp.amount,
                    description: exp.description,
                    expense_date: exp.expense_date
                }));

            // Monthly trend (last 6 months)
            const last6Start = new Date(now.getUTCFullYear(), now.getUTCMonth() - 5, 1).toISOString().slice(0,10);
            const trendExpenses = allExpenses.filter(exp => exp.expense_date >= last6Start);
            const monthlyTrendMap = {};
            trendExpenses.forEach(exp => {
                const date = new Date(exp.expense_date);
                const bucket = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (!monthlyTrendMap[bucket]) {
                    monthlyTrendMap[bucket] = { date: bucket, amount: 0 };
                }
                monthlyTrendMap[bucket].amount += Number(exp.amount);
            });
            const monthlyTrend = Object.values(monthlyTrendMap)
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(r => ({ date: r.date, amount: Number(r.amount) }));

            const data = { currentMonth, topCategories, recentExpenses, monthlyTrend };
            await redis.setEx(cacheKey, 600, JSON.stringify(data));
            res.json(data);
        } catch (error) { next(error); }
    }
}

module.exports = new ReportController();

