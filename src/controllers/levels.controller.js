const Level = require('../models/levels.model');
const Team = require('../models/team.model');
const TestCase = require('../models/testCases.model');
const LevelProgress = require('../models/levelProgress.model');
const CacheUtil = require('../utils/cache.util');
const crypto = require('crypto');

const addLevel = async(req, res) => {
    try {
        const { 
            title, 
            description,
            languageId,
            language,
            codeTemplate,
            testCases,
            hints,
            difficulty,
            difficultyScore,
            adminUsername,
            adminPassword
        } = req.body;

        // Admin authentication
        const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
        const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || crypto.createHash('sha256').update('admin123').digest('hex');
        
        if (!adminUsername || !adminPassword) {
            return res.status(401).json({
                success: false,
                message: 'Admin credentials required'
            });
        }
        
        const passwordHash = crypto.createHash('sha256').update(adminPassword).digest('hex');
        
        if (adminUsername !== ADMIN_USERNAME || passwordHash !== ADMIN_PASSWORD_HASH) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        if (!title || !description || !languageId || !language || !difficulty || !difficultyScore) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        const lastLevel = await Level.findOne().sort({ levelNumber: -1 });
        const levelNumber = lastLevel ? lastLevel.levelNumber + 1 : 1;

        if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'At least one test case is required'
            });
        }

        const newLevel = new Level({
            levelNumber,
            title,
            description,
            languageId,
            language,
            codeTemplate: codeTemplate || '',
            testCases: [],
            hints: hints || [],
            difficulty,
            difficultyScore
        });

        await newLevel.save();

        const testCaseIds = [];
        for (const testCase of testCases) {
            const newTestCase = new TestCase({
                levelId: newLevel._id,
                input: testCase.input,
                output: testCase.output
            });
            
            const savedTestCase = await newTestCase.save();
            testCaseIds.push(savedTestCase._id);
        }

        newLevel.testCases = testCaseIds;
        await newLevel.save();
        await newLevel.populate('testCases');
        await CacheUtil.invalidateAllLevels();
        res.status(201).json({
            success: true,
            message: 'Level added successfully',
            data: newLevel
        });
    } catch (error) {
        console.error('Error adding level:', error);
        res.status(500).json({
            success: false,
            message: 'Error adding level',
            error: error.message
        });
    }
}

const getLevels = async (req, res) => {
    try {
        const {id} = req.user;
        const team = await Team.findById(id).select('levelCompleted').lean();
        if (!team) {
            return res.status(404).json({success: false, message: 'Team not found'});
        }
        
        let totalLevels = await CacheUtil.getLevelCount();
        if (totalLevels === null) {
            totalLevels = await Level.countDocuments();
            await CacheUtil.setLevelCount(totalLevels);
        }
        const currentLevel = (Number(team.levelCompleted) || 0) + 1;
        
        res.status(200).json({
            success: true,
            message: 'Levels fetched successfully',
            count: totalLevels,
            currentLevel: currentLevel,
            isMoreLevels: totalLevels && currentLevel < totalLevels
        });
    } catch (error) {
        res.status(500).json({success: false, message: 'Error fetching levels', error: error.message});
    }
};

const getIndLevel = async(req, res) => {
    try {
        const { levelId } = req.params;
        let level = await CacheUtil.getLevel(levelId);
        if (!level) {
            level = await Level.findOne({ _id: levelId }).select('-testCases -hints').lean();
            if (!level) {
                return res.status(404).json({success: false, message: 'Level not found'});
            }
            await CacheUtil.setLevel(level);
        }
        res.status(200).json({success: true, data: level, message: 'Level fetched successfully'});
    } catch (error) {
        res.status(500).json({success: false, message: 'Error fetching level', error: error.message});
    }
};

const getTeamCurrentLevel = async(req, res) => {
    try {
        const {id} = req.user;
        const team = await Team.findById(id).select('levelCompleted loginAt score').lean();0

        if (!team) {
            return res.status(404).json({success: false, message: 'Team not found'});
        }
        const currentLevelNumber = (Number(team.levelCompleted) || 0) + 1;
        
        let totalLevels = await CacheUtil.getLevelCount();
        if (totalLevels === null) {
            totalLevels = await Level.countDocuments();
            await CacheUtil.setLevelCount(totalLevels);
        }
        
        if(totalLevels && currentLevelNumber > totalLevels) {
            const latestProgress = await LevelProgress.findOne({teamId: id})
                .sort({completedAt: -1})
                .select('completedAt')
                .lean();
            
            const timeTaken = latestProgress?.completedAt 
                ? new Date(latestProgress.completedAt).getTime() - new Date(team.loginAt).getTime()
                : new Date().getTime() - new Date(team.loginAt).getTime();
            
            return res.status(400).json({
                success: false,
                message: 'Congratulations! All levels completed',
                isMoreLevels: false,
                allCompleted: true,
                result: {
                    timeTaken: timeTaken,
                    score: team.score,
                    loginAt: team.loginAt,
                    levelCompleted: team.levelCompleted
                }
            });
        }
        let level = await CacheUtil.getLevelByNumber(currentLevelNumber);
        if (!level) {
            level = await Level.findOne({levelNumber: currentLevelNumber}).select('-testCases -hints').lean();
            if (level) {
                await CacheUtil.setLevel(level);
            }
        }
        
        if (!level) {
            const latestProgress = await LevelProgress.findOne({teamId: id})
                .sort({completedAt: -1})
                .select('completedAt startAt')
                .lean();
            
            const timeTaken = latestProgress?.completedAt 
                ? new Date(latestProgress.completedAt).getTime() - new Date(team.loginAt).getTime()
                : new Date().getTime() - new Date(team.loginAt).getTime();
            
            return res.status(200).json({
                success: true,
                message: 'Congratulations! All levels completed',
                isMoreLevels: false,
                allCompleted: true,
                result: {
                    timeTaken: timeTaken,
                    score: team.score,
                    loginAt: team.loginAt,
                    levelCompleted: team.levelCompleted
                }
            });
        }
        
        let levelProgress = await LevelProgress.findOne({ teamId: id, level: currentLevelNumber }).lean();
        if (!levelProgress) {
            await LevelProgress.create({
                teamId: id,
                level: level.levelNumber,
                levelId: level._id,
                startAt: new Date(),
            });
        }
        res.status(200).json({
            success: true, 
            data: level,
            isMoreLevels: currentLevelNumber < totalLevels,
            message: 'Team current level fetched successfully'
        });
    } catch (error) {
        console.error('Error in getTeamCurrentLevel:', error);
        res.status(500).json({
            success: false, 
            message: 'Error fetching team current level', 
            error: error.message
        });
    }
};

const getHintsForLevel = async (req, res) => {
    try {
        const { id } = req.user;
        const team = await Team.findById(id).select('score levelCompleted');
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }
        
        const currentLevelNumber = (Number(team.levelCompleted) || 0) + 1;
        
        // Always fetch hints directly from DB (don't cache)
        const level = await Level.findOne({ levelNumber: currentLevelNumber }).select('hints').lean();
        if (!level) {
            return res.status(404).json({ success: false, message: 'Level not found' });
        }

        if (!level.hints || level.hints.length === 0) {
            return res.status(200).json({ success: true, data: [], message: 'No hints available for this level' });
        }
        
        const scoreToBeDeducted = parseInt(process.env.HINT_SCORE_DEDUCTION) || 1;
        team.score = Math.max(0, team.score - scoreToBeDeducted);
        await team.save();
        await CacheUtil.invalidateTeam(id);
        
        res.status(200).json({ success: true, data: level.hints, message: 'Hints fetched successfully' });
    } catch (error) {
        console.error('Error in getHintsForLevel:', error);
        res.status(500).json({ success: false, message: 'Error fetching hints', error: error.message });
    }
};

module.exports = {
    addLevel,
    getLevels,
    getIndLevel,
    getTeamCurrentLevel,
    getHintsForLevel
};