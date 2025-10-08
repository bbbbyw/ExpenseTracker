const express = require('express');
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const controller = require('../controllers/expense.controller');

const router = express.Router();

router.post(
    '/',
    authenticate,
    [
        body('categoryId').isInt({ gt: 0 }),
        body('amount').isFloat({ gt: 0 }),
        body('description').optional().isString(),
        body('expenseDate').isISO8601(),
        body('receiptUrl').optional().isString(),
        validate
    ],
    controller.create
);

router.get(
    '/',
    authenticate,
    [
        query('startDate').optional().isISO8601(),
        query('endDate').optional().isISO8601(),
        query('categoryId').optional().isInt({ gt: 0 }),
        query('minAmount').optional().isFloat({ gt: 0 }),
        query('maxAmount').optional().isFloat({ gt: 0 }),
        query('page').optional().isInt({ gt: 0 }),
        query('limit').optional().isInt({ gt: 0 }),
        validate
    ],
    controller.list
);

router.get('/:id', authenticate, controller.getById);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);
router.get('/stats', authenticate, controller.stats);

module.exports = router;

