const Redis = require('ioredis');

let redisClient = null;

const connectRedis = () => {
    try {
        redisClient = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
            lazyConnect: false,
            enableReadyCheck: true
        });

        redisClient.on('connect', () => {
            console.log('Redis: Connected');
        });

        redisClient.on('ready', () => {
            console.log('Redis: Ready');
        });

        redisClient.on('error', (err) => {
            console.error('Redis Error:', err.message);
        });

        redisClient.on('close', () => {
            console.log('Redis: Connection closed');
        });

        redisClient.on('reconnecting', () => {
            console.log('Redis: Reconnecting...');
        });

        return redisClient;
    } catch (error) {
        console.error('Redis connection failed:', error.message);
        return null;
    }
};

const getRedisClient = () => {
    if (!redisClient || redisClient.status !== 'ready') {
        console.warn('Redis client not ready');
        return null;
    }
    return redisClient;
};

const disconnectRedis = async () => {
    if (redisClient) {
        await redisClient.quit();
        console.log('Redis: Disconnected');
    }
};

module.exports = {
    connectRedis,
    getRedisClient,
    disconnectRedis
};
