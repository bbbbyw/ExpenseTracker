const express = require('express');
const { query, body } = require('express-validator');
const axios = require('axios');
const controller = require('../controllers/report.controller');

const router = express.Router();

// Lightweight auth proxy: call auth validate-token
router.use(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Authentication token required' });
        await axios.post(`${process.env.AUTH_SERVICE_URL}/api/v1/auth/validate-token`, {}, { headers: { Authorization: token } });
        // response includes user; for simplicity, rely on Expense/DB queries using the token as needed
        req.user = {}; // not strictly used, controllers use token and DB filters by user_id param
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
});

router.get('/monthly', [query('year').isInt({ gt: 2000 }), query('month').isInt({ min: 1, max: 12 })], controller.monthly);
router.get('/category', [query('startDate').isISO8601(), query('endDate').isISO8601()], controller.byCategory);
router.get('/trend', [query('startDate').isISO8601(), query('endDate').isISO8601(), query('interval').optional().isIn(['daily','weekly','monthly'])], controller.trend);
router.post('/export', [body('startDate').isISO8601(), body('endDate').isISO8601(), body('format').equals('csv')], controller.export);
router.get('/dashboard', controller.dashboard);

module.exports = router;

