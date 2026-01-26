const redis = require('redis');

const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});

client.on('error', (err) => console.error('Redis Client Error', err));
client.on('connect', () => console.log('Connected to Redis'));

// Avoid noisy connection attempts during unit tests.
if (process.env.NODE_ENV !== 'test') {
    client.connect();
}

module.exports = client;

