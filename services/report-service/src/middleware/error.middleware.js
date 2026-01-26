const errorHandler = (err, req, res, next) => {
    console.error('Report Service Error:', err);

    // Handle axios errors
    if (err.response) {
        const status = err.response.status || 500;
        const message = err.response.data?.error || err.response.data?.message || 'External service error';
        return res.status(status).json({
            error: message,
            ...(process.env.NODE_ENV === 'development' && { details: err.response.data })
        });
    }

    // Handle Redis connection errors
    if (err.code === 'ECONNREFUSED' && err.syscall === 'connect') {
        return res.status(503).json({ error: 'Cache service unavailable' });
    }

    // Handle database errors
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Resource already exists' });
    }

    if (err.code === '23503') {
        return res.status(400).json({ error: 'Referenced resource not found' });
    }

    // Default error response
    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
