const db = require('../config/database');

class CategoryController {
    async getAll(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { rows } = await db.query(
                `SELECT id, user_id, name, color, icon, monthly_budget, is_default
                 FROM categories WHERE user_id = $1 OR is_default = true
                 ORDER BY is_default DESC, name ASC`,
                [userId]
            );
            res.json({ categories: rows });
        } catch (error) { next(error); }
    }

    async getById(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { rows } = await db.query(
                `SELECT id, user_id, name, color, icon, monthly_budget, is_default
                 FROM categories WHERE id = $1 AND (user_id = $2 OR is_default = true)`,
                [id, userId]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
            res.json(rows[0]);
        } catch (error) { next(error); }
    }

    async create(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { name, color, icon, monthlyBudget } = req.body;
            const { rows } = await db.query(
                `INSERT INTO categories (user_id, name, color, icon, monthly_budget, is_default)
                 VALUES ($1, $2, $3, $4, $5, false) RETURNING *`,
                [userId, name, color, icon, monthlyBudget || null]
            );
            res.status(201).json(rows[0]);
        } catch (error) { next(error); }
    }

    async update(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { name, color, icon, monthlyBudget } = req.body;
            const { rows } = await db.query(
                `UPDATE categories SET
                   name = COALESCE($1, name),
                   color = COALESCE($2, color),
                   icon = COALESCE($3, icon),
                   monthly_budget = COALESCE($4, monthly_budget)
                 WHERE id = $5 AND user_id = $6 AND is_default = false
                 RETURNING *`,
                [name || null, color || null, icon || null, monthlyBudget || null, id, userId]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
            res.json(rows[0]);
        } catch (error) { next(error); }
    }

    async remove(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { rowCount } = await db.query(
                `DELETE FROM categories WHERE id = $1 AND user_id = $2 AND is_default = false`,
                [id, userId]
            );
            if (rowCount === 0) return res.status(404).json({ error: 'Category not found' });
            res.json({ message: 'Deleted' });
        } catch (error) { next(error); }
    }

    async setBudget(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { monthlyBudget } = req.body;
            const { rows } = await db.query(
                `UPDATE categories SET monthly_budget = $1 WHERE id = $2 AND user_id = $3 AND is_default = false RETURNING id, monthly_budget`,
                [monthlyBudget, id, userId]
            );
            if (rows.length === 0) return res.status(404).json({ error: 'Category not found' });
            res.json(rows[0]);
        } catch (error) { next(error); }
    }

    async getSpending(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params; // category id
            const { month } = req.query; // YYYY-MM

            // Calculate first and last day of month
            const startDate = `${month}-01`;
            const endDate = `${month}-31`;

            const { rows: catRows } = await db.query(
                `SELECT monthly_budget FROM categories WHERE id = $1 AND (user_id = $2 OR is_default = true)`,
                [id, userId]
            );
            if (catRows.length === 0) return res.status(404).json({ error: 'Category not found' });
            const budget = Number(catRows[0].monthly_budget || 0);

            // Prefer querying Expense Service stats to avoid cross-service DB coupling
            let spent = 0;
            try {
                const axios = require('axios');
                const resp = await axios.get(`${process.env.EXPENSE_SERVICE_URL}/api/v1/expenses/stats`, {
                    headers: { Authorization: req.headers.authorization },
                    params: { startDate, endDate, categoryId: id }
                });
                spent = Number(resp.data.totalAmount || 0);
            } catch (e) {
                spent = 0;
            }
            const remaining = Math.max(budget - spent, 0);
            const percentage = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
            res.json({ categoryId: Number(id), budget, spent, remaining, percentage });
        } catch (error) { next(error); }
    }
}

module.exports = new CategoryController();

