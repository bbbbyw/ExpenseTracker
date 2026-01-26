const errorHandler = (err, req, res, next) => {
    console.error('Expense Service Error:', err);
    console.error('Request path:', req.path);
    console.error('Request method:', req.method);

    // Handle axios errors (from auth service calls)
    if (err.response) {
        const status = err.response.status || 500;
        const message = err.response.data?.error || err.response.data?.message || 'External service error';
        return res.status(status).json({
            error: message,
            ...(process.env.NODE_ENV === 'development' && { details: err.response.data })
        });
    }

    // Handle database errors
    if (err.code === '23505') {
        return res.status(400).json({ error: 'Resource already exists' });
    }

    if (err.code === '23503') {
        return res.status(400).json({ error: 'Referenced resource not found' });
    }

    // Handle invalid input errors
    if (err.code === '22P02') {
        return res.status(400).json({ error: 'Invalid input format' });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = { errorHandler };
