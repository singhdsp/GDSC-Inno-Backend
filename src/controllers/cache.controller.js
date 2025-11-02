const CacheUtil = require('../utils/cache.util');

const clearAllCache = async (req, res) => {
    try {
        await CacheUtil.delPattern('*');
        res.status(200).json({
            success: true,
            message: 'All cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing cache:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing cache',
            error: error.message
        });
    }
};

const clearTeamCache = async (req, res) => {
    try {
        await CacheUtil.delPattern('team:*');
        res.status(200).json({
            success: true,
            message: 'Team cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing team cache:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing team cache',
            error: error.message
        });
    }
};

const clearLevelCache = async (req, res) => {
    try {
        await CacheUtil.invalidateAllLevels();
        res.status(200).json({
            success: true,
            message: 'Level cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing level cache:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing level cache',
            error: error.message
        });
    }
};

const clearLeaderboardCache = async (req, res) => {
    try {
        await CacheUtil.invalidateLeaderboard();
        res.status(200).json({
            success: true,
            message: 'Leaderboard cache cleared successfully'
        });
    } catch (error) {
        console.error('Error clearing leaderboard cache:', error);
        res.status(500).json({
            success: false,
            message: 'Error clearing leaderboard cache',
            error: error.message
        });
    }
};

module.exports = {
    clearAllCache,
    clearTeamCache,
    clearLevelCache,
    clearLeaderboardCache
};
