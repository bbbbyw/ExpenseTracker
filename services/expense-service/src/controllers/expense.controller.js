const db = require('../config/database');
const mq = require('../config/messageQueue');

class ExpenseController {
    async create(req, res, next) {
        try {
            const { categoryId, amount, description, expenseDate, receiptUrl } = req.body;
            const userId = req.user.id || req.user.userId;

            const result = await db.query(
                `INSERT INTO expenses (user_id, category_id, amount, description, expense_date, receipt_url)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 RETURNING *`,
                [userId, categoryId, amount, description || null, expenseDate, receiptUrl || null]
            );

            const expense = result.rows[0];
            await mq.publishExpenseCreated({ ...expense, userId });
            res.status(201).json(expense);
        } catch (error) {
            next(error);
        }
    }

    async list(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate, categoryId, minAmount, maxAmount, page = 1, limit = 10 } = req.query;

            const where = ['user_id = $1'];
            const params = [userId];
            let idx = 2;

            if (startDate) { where.push(`expense_date >= $${idx++}`); params.push(startDate); }
            if (endDate) { where.push(`expense_date <= $${idx++}`); params.push(endDate); }
            if (categoryId) { where.push(`category_id = $${idx++}`); params.push(categoryId); }
            if (minAmount) { where.push(`amount >= $${idx++}`); params.push(minAmount); }
            if (maxAmount) { where.push(`amount <= $${idx++}`); params.push(maxAmount); }

            const offset = (Number(page) - 1) * Number(limit);

            const query = `SELECT * FROM expenses WHERE ${where.join(' AND ')}
                           ORDER BY expense_date DESC
                           LIMIT $${idx} OFFSET $${idx + 1}`;
            params.push(Number(limit), offset);

            const { rows } = await db.query(query, params);
            res.json({ expenses: rows, pagination: { page: Number(page), limit: Number(limit) } });
        } catch (error) {
            next(error);
        }
    }

    async getById(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { rows } = await db.query('SELECT * FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
            if (rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
            res.json(rows[0]);
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { categoryId, amount, description, expenseDate } = req.body;

            const { rows } = await db.query(
                `UPDATE expenses SET
                   category_id = COALESCE($1, category_id),
                   amount = COALESCE($2, amount),
                   description = COALESCE($3, description),
                   expense_date = COALESCE($4, expense_date),
                   updated_at = NOW()
                 WHERE id = $5 AND user_id = $6
                 RETURNING *`,
                [categoryId || null, amount || null, description || null, expenseDate || null, id, userId]
            );

            if (rows.length === 0) return res.status(404).json({ error: 'Expense not found' });
            const expense = rows[0];
            await mq.publishExpenseUpdated({ ...expense, userId });
            res.json(expense);
        } catch (error) {
            next(error);
        }
    }

    async remove(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { id } = req.params;
            const { rowCount } = await db.query('DELETE FROM expenses WHERE id = $1 AND user_id = $2', [id, userId]);
            if (rowCount === 0) return res.status(404).json({ error: 'Expense not found' });
            await mq.publishExpenseDeleted(Number(id), userId);
            res.json({ message: 'Deleted' });
        } catch (error) {
            next(error);
        }
    }

    async stats(req, res, next) {
        try {
            const userId = req.user.id || req.user.userId;
            const { startDate, endDate, categoryId } = req.query;
            const where = ['user_id = $1'];
            const params = [userId];
            let idx = 2;
            if (startDate) { where.push(`expense_date >= $${idx++}`); params.push(startDate); }
            if (endDate) { where.push(`expense_date <= $${idx++}`); params.push(endDate); }
            if (categoryId) { where.push(`category_id = $${idx++}`); params.push(categoryId); }
            const query = `SELECT COUNT(*)::int AS expense_count, 
                                  COALESCE(SUM(amount),0)::float AS total_amount,
                                  COALESCE(AVG(amount),0)::float AS average_amount,
                                  COALESCE(MIN(amount),0)::float AS min_amount,
                                  COALESCE(MAX(amount),0)::float AS max_amount
                           FROM expenses WHERE ${where.join(' AND ')}`;
            const { rows } = await db.query(query, params);
            const r = rows[0];
            res.json({ totalExpenses: r.expense_count, totalAmount: r.total_amount, averageAmount: r.average_amount, minAmount: r.min_amount, maxAmount: r.max_amount });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ExpenseController();

