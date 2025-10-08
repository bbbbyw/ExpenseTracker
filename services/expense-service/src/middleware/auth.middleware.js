const axios = require('axios');

const authenticate = async (req, res, next) => {
    try {
        const token = req.headers.authorization;
        if (!token) {
            return res.status(401).json({ error: 'Authentication token required' });
        }

        const response = await axios.post(
            `${process.env.AUTH_SERVICE_URL}/api/v1/auth/validate-token`,
            {},
            { headers: { 'Authorization': token } }
        );

        if (response.data.valid) {
            req.user = response.data.user;
            next();
        } else {
            return res.status(401).json({ error: 'Invalid token' });
        }
    } catch (error) {
        if (error.response?.status === 401) {
            return res.status(401).json({ error: 'Invalid or expired token' });
        }
        return res.status(500).json({ error: 'Authentication failed' });
    }
};

module.exports = { authenticate };

