const client = require('prom-client');

// Create a Registry to register the metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code', 'service'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'service']
});

const httpRequestErrors = new client.Counter({
    name: 'http_request_errors_total',
    help: 'Total number of HTTP request errors',
    labelNames: ['method', 'route', 'status_code', 'service']
});

const dbQueryDuration = new client.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['service', 'operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5]
});

// Register custom metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(httpRequestErrors);
register.registerMetric(dbQueryDuration);

// Middleware to track HTTP requests
const metricsMiddleware = (serviceName) => {
    return (req, res, next) => {
        const start = Date.now();
        const route = req.route ? req.route.path : req.path;

        res.on('finish', () => {
            const duration = (Date.now() - start) / 1000;
            const labels = {
                method: req.method,
                route: route || 'unknown',
                status_code: res.statusCode,
                service: serviceName
            };

            httpRequestDuration.observe(labels, duration);
            httpRequestTotal.inc(labels);

            if (res.statusCode >= 400) {
                httpRequestErrors.inc(labels);
            }
        });

        next();
    };
};

module.exports = {
    register,
    metricsMiddleware,
    httpRequestDuration,
    httpRequestTotal,
    httpRequestErrors,
    dbQueryDuration
};
