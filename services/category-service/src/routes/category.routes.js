const express = require('express');
const { body, query } = require('express-validator');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const controller = require('../controllers/category.controller');

const router = express.Router();

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);

router.post(
    '/',
    authenticate,
    [
        body('name').isString().notEmpty(),
        body('color').optional().isString(),
        body('icon').optional().isString(),
        body('monthlyBudget').optional().isFloat({ gt: 0 }),
        validate
    ],
    controller.create
);

router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

router.put('/:id/budget', authenticate, [body('monthlyBudget').isFloat({ gt: 0 }), validate], controller.setBudget);
router.get('/:id/spending', authenticate, [query('month').matches(/^\d{4}-\d{2}$/)], controller.getSpending);

module.exports = router;

