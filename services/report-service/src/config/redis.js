const redis = require('redis');

const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.on('error', (err) => console.error('Redis error', err));
client.on('connect', () => console.log('Report Service connected to Redis'));
client.on('ready', () => console.log('Report Service Redis client ready'));

// Avoid noisy connection attempts during unit tests.
if (process.env.NODE_ENV !== 'test') {
  client.connect().catch((err) => {
    console.error('Failed to connect to Redis:', err.message);
    console.warn('Report Service will continue without Redis caching');
  });
}

module.exports = client;

