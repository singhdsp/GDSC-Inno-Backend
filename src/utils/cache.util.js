const { getRedisClient } = require('../config/redis.config');

class CacheUtil {
    static TTL = {
        TEAM: 7200,
        LEVEL: 7200,
        TESTCASES: 86400,
        LEADERBOARD: 60,
        LEVEL_COUNT: 7200
    };

    static async get(key) {
        try {
            const client = getRedisClient();
            if (!client) return null;

            const data = await client.get(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`Cache GET error [${key}]:`, error.message);
            return null;
        }
    }

    static async set(key, value, ttl) {
        try {
            const client = getRedisClient();
            if (!client) return false;

            await client.setex(key, ttl, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Cache SET error [${key}]:`, error.message);
            return false;
        }
    }

    static async del(key) {
        try {
            const client = getRedisClient();
            if (!client) return false;

            await client.del(key);
            return true;
        } catch (error) {
            console.error(`Cache DEL error [${key}]:`, error.message);
            return false;
        }
    }

    static async delPattern(pattern) {
        try {
            const client = getRedisClient();
            if (!client) return false;

            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(...keys);
            }
            return true;
        } catch (error) {
            console.error(`Cache DEL pattern error [${pattern}]:`, error.message);
            return false;
        }
    }

    static async getTeam(teamId) {
        return await this.get(`team:${teamId}`);
    }

    static async setTeam(teamId, teamData) {
        return await this.set(`team:${teamId}`, teamData, this.TTL.TEAM);
    }

    static async invalidateTeam(teamId) {
        await this.del(`team:${teamId}`);
        await this.delPattern('leaderboard:*');
    }
    static async getLevel(levelId) {
        return await this.get(`level:${levelId}`);
    }
    static async getLevelByNumber(levelNumber) {
        return await this.get(`level:number:${levelNumber}`);
    }

    static async setLevel(levelData) {
        if (!levelData || !levelData._id) return false;
        
        await this.set(`level:${levelData._id}`, levelData, this.TTL.LEVEL);
        
        if (levelData.levelNumber !== undefined) {
            await this.set(`level:number:${levelData.levelNumber}`, levelData, this.TTL.LEVEL);
        }
        return true;
    }

    static async invalidateAllLevels() {
        await this.delPattern('level:*');
        await this.del('level:count');
        console.log('🗑️  Invalidated all level caches');
    }
    static async getTestCases(levelId) {
        return await this.get(`testcases:${levelId}`);
    }
    static async setTestCases(levelId, testCases) {
        return await this.set(`testcases:${levelId}`, testCases, this.TTL.TESTCASES);
    }
    static async invalidateTestCases(levelId) {
        await this.del(`testcases:${levelId}`);
        console.log(`🗑️  Invalidated testcases:${levelId}`);
    }
    static async getLevelCount() {
        const count = await this.get('level:count');
        return count !== null ? count : null;
    }
    static async setLevelCount(count) {
        return await this.set('level:count', count, this.TTL.LEVEL_COUNT);
    }
    static async getLeaderboard(page = 1, limit = 10) {
        return await this.get(`leaderboard:page:${page}:limit:${limit}`);
    }
    static async setLeaderboard(page, limit, data) {
        return await this.set(`leaderboard:page:${page}:limit:${limit}`, data, this.TTL.LEADERBOARD);
    }

    static async invalidateLeaderboard() {
        await this.delPattern('leaderboard:*');
        console.log('🗑️  Invalidated all leaderboard caches');
    }
}

module.exports = CacheUtil;
