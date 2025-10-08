const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');

const router = express.Router();

router.post(
    '/register',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 8 }),
        body('firstName').trim().notEmpty(),
        body('lastName').trim().notEmpty(),
        validate
    ],
    authController.register
);

router.post(
    '/login',
    [
        body('email').isEmail().normalizeEmail(),
        body('password').notEmpty(),
        validate
    ],
    authController.login
);

router.post('/refresh', authController.refresh);
router.post('/validate-token', authController.validateToken);
router.post('/logout', authController.logout);
router.get('/me', authenticate, authController.getProfile);

module.exports = router;

