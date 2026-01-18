const express = require('express');
const { query, body, validationResult } = require('express-validator');
const axios = require('axios');
const controller = require('../controllers/report.controller');

const router = express.Router();

// Validation middleware
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ error: 'Validation failed', details: errors.array() });
    }
    next();
};

// Auth middleware: call auth validate-token and extract user
router.use(async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) return res.status(401).json({ error: 'Authentication token required' });
        
        const response = await axios.post(
            `${process.env.AUTH_SERVICE_URL}/api/v1/auth/validate-token`,
            {},
            { headers: { Authorization: token } }
        );
        
        if (response.data.valid && response.data.user) {
            req.user = response.data.user;
            next();
        } else {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (e) {
        if (e.response?.status === 401) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
});

router.get('/monthly', [query('year').isInt({ gt: 2000 }), query('month').isInt({ min: 1, max: 12 }), validate], controller.monthly);
router.get('/category', [query('startDate').isISO8601(), query('endDate').isISO8601(), validate], controller.byCategory);
router.get('/trend', [query('startDate').isISO8601(), query('endDate').isISO8601(), query('interval').optional().isIn(['daily','weekly','monthly']), validate], controller.trend);
router.post('/export', [body('startDate').isISO8601(), body('endDate').isISO8601(), body('format').equals('csv'), validate], controller.export);
router.get('/dashboard', controller.dashboard);

module.exports = router;

