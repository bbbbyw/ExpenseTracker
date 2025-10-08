const redis = require('redis');

const client = redis.createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
client.on('error', (err) => console.error('Redis error', err));
client.on('connect', () => console.log('Report Service connected to Redis'));
client.connect();

module.exports = client;

