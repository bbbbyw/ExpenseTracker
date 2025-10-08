const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const redis = require('../config/redis');

class AuthController {
    async register(req, res, next) {
        try {
            const { email, password, firstName, lastName } = req.body;

            const existingUser = await db.query(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({ error: 'Email already registered' });
            }

            const passwordHash = await bcrypt.hash(password, 10);

            const result = await db.query(
                `INSERT INTO users (email, password_hash, first_name, last_name) 
                 VALUES ($1, $2, $3, $4) 
                 RETURNING id, email, first_name, last_name, created_at`,
                [email, passwordHash, firstName, lastName]
            );

            const user = result.rows[0];

            res.status(201).json({
                message: 'User registered successfully',
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            const result = await db.query(
                'SELECT * FROM users WHERE email = $1 AND is_active = true',
                [email]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const user = result.rows[0];
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const accessToken = jwt.sign(
                { userId: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '15m' }
            );

            const refreshToken = jwt.sign(
                { userId: user.id },
                process.env.JWT_SECRET,
                { expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d' }
            );

            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7);

            await db.query(
                'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
                [user.id, refreshToken, expiresAt]
            );

            await redis.setEx(
                `user:${user.id}`,
                900,
                JSON.stringify({
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name
                })
            );

            res.json({
                accessToken,
                refreshToken,
                user: {
                    id: user.id,
                    email: user.email,
                    firstName: user.first_name,
                    lastName: user.last_name
                }
            });
        } catch (error) {
            next(error);
        }
    }

    async refresh(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return res.status(400).json({ error: 'Refresh token required' });
            }

            const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

            const result = await db.query(
                'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > NOW()',
                [refreshToken]
            );

            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            const accessToken = jwt.sign(
                { userId: decoded.userId },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRE || '15m' }
            );

            res.json({ accessToken });
        } catch (error) {
            next(error);
        }
    }

    async validateToken(req, res, next) {
        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                return res.status(401).json({ error: 'Token required' });
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            let user = await redis.get(`user:${decoded.userId}`);

            if (!user) {
                const result = await db.query(
                    'SELECT id, email, first_name, last_name FROM users WHERE id = $1 AND is_active = true',
                    [decoded.userId]
                );

                if (result.rows.length === 0) {
                    return res.status(401).json({ error: 'User not found' });
                }

                user = result.rows[0];
                await redis.setEx(
                    `user:${user.id}`,
                    900,
                    JSON.stringify({
                        id: user.id,
                        email: user.email,
                        firstName: user.first_name,
                        lastName: user.last_name
                    })
                );
            } else {
                user = JSON.parse(user);
            }

            res.json({ valid: true, user });
        } catch (error) {
            if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Invalid token' });
            }
            next(error);
        }
    }

    async logout(req, res, next) {
        try {
            const { refreshToken } = req.body;

            if (refreshToken) {
                await db.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
            }

            res.json({ message: 'Logged out successfully' });
        } catch (error) {
            next(error);
        }
    }

    async getProfile(req, res, next) {
        try {
            const userId = req.user.userId;

            const result = await db.query(
                'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1',
                [userId]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = result.rows[0];

            res.json({
                id: user.id,
                email: user.email,
                firstName: user.first_name,
                lastName: user.last_name,
                createdAt: user.created_at
            });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AuthController();

