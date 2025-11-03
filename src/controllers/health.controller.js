const mongoose = require('mongoose');
const { getRedisClient } = require('../config/redis.config');
const { BlobServiceClient } = require('@azure/storage-blob');
const axios = require('axios');

const HEALTH_CHECK_TIMEOUT = 3000;

const checkMongoDB = async () => {
    try {
        const state = mongoose.connection.readyState;
        if (state !== 1) {
            return { status: 'unhealthy', message: `MongoDB connection state: ${state}` };
        }        
        await mongoose.connection.db.admin().ping();
        return { status: 'healthy', message: 'MongoDB is connected and responding' };
    } catch (error) {
        return { status: 'unhealthy', message: `MongoDB error: ${error.message}` };
    }
};


const checkRedis = async () => {
    try {
        const client = getRedisClient();
        if (!client) {
            return { status: 'unhealthy', message: 'Redis client not initialized or not ready' };
        }

        const pingPromise = client.ping();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Redis ping timeout')), HEALTH_CHECK_TIMEOUT)
        );

        const result = await Promise.race([pingPromise, timeoutPromise]);        
        if (result === 'PONG') {
            return { status: 'healthy', message: 'Redis is connected and responding' };
        }
        
        return { status: 'unhealthy', message: 'Redis did not respond with PONG' };
    } catch (error) {
        return { status: 'unhealthy', message: `Redis error: ${error.message}` };
    }
};

const checkAzure = async () => {
    try {
        const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
        const containerName = process.env.AZURE_CONTAINER_NAME || 'gdsc-inno';
        
        if (!connectionString) {
            return { status: 'optional', message: 'Azure Storage not configured' };
        }

        const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
        const containerClient = blobServiceClient.getContainerClient(containerName);      

        const propertiesPromise = containerClient.getProperties();
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Azure check timeout')), HEALTH_CHECK_TIMEOUT)
        );

        await Promise.race([propertiesPromise, timeoutPromise]);        
        return { status: 'healthy', message: 'Azure Blob Storage is accessible' };
    } catch (error) {
        return { status: 'unhealthy', message: `Azure error: ${error.message}` };
    }
};

const checkJudge0 = async () => {
    try {
        const judge0Url = process.env.JUDGE0_API_URL || 'https://ce.judge0.com';
        
        if (!judge0Url) {
            return { status: 'optional', message: 'Judge0 API not configured' };
        }

        const healthPromise = axios.get(`${judge0Url.replace(/\/$/, '')}/`, { timeout: HEALTH_CHECK_TIMEOUT });
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Judge0 check timeout')), HEALTH_CHECK_TIMEOUT)
        );
        await Promise.race([healthPromise, timeoutPromise]);
        
        return { status: 'healthy', message: 'Judge0 API is accessible' };
    } catch (error) {
        return { status: 'unhealthy', message: `Judge0 error: ${error.message}` };
    }
};

const healthCheck = async (req, res) => {
    const startTime = Date.now();
    const checks = {
        mongodb: await checkMongoDB(),
        redis: await checkRedis(),
        azure: await checkAzure(),
        judge0: await checkJudge0()
    };

    const responseTime = Date.now() - startTime;    
    const criticalServices = [checks.mongodb, checks.redis];
    const isHealthy = criticalServices.every(check => check.status === 'healthy');    
    const statusCode = isHealthy ? 200 : 503;
    const overallStatus = isHealthy ? 'healthy' : 'unhealthy';

    res.status(statusCode).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        uptime: `${Math.floor(process.uptime())}s`,
        services: checks,
        version: '1.0.1'
    });
};

module.exports = {
    healthCheck
};

