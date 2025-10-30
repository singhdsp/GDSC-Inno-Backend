const Level = require('../models/levels.model');
const LevelProgress = require('../models/levelProgress.model');
const Team = require('../models/team.model');
const CacheUtil = require('../utils/cache.util');

const {runTestCases} = require('../utils/judge0.util');

const submitLevel = async (req, res) => {
    const {code} = req.body;
    const teamId = req.teamId;
    
    try {
        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }

        const currentLevelNumber = Number(team.levelCompleted) + 1 || 1;
        let level = await CacheUtil.getLevelByNumber(currentLevelNumber);
        if (!level) {
            level = await Level.findOne({ levelNumber: currentLevelNumber });
            if (!level) {
                return res.status(404).json({ success: false, message: 'Level not found' });
            }
            await CacheUtil.setLevel(level.toObject());
        }
        let testCases = await CacheUtil.getTestCases(level._id);
        if (!testCases) {
            const levelWithTestCases = await Level.findById(level._id).populate('testCases');
            testCases = levelWithTestCases.testCases;
            await CacheUtil.setTestCases(level._id, testCases);
        }
        const testResults = await runTestCases(code, level.languageId, testCases);
        if (!testResults.success) {
            return res.status(500).json({
                success: false,
                message: 'Error running test cases',
                error: testResults.error
            });
        }

        const passedTestCases = testResults.results.filter(r => r.passed).length;
        const totalTestCases = testResults.results.length;
        const allPassed = passedTestCases === totalTestCases;

        let levelProgress = await LevelProgress.findOne({
            teamId: teamId,
            levelId: level._id
        });

        if (!levelProgress) {
            return res.status(400).json({
                success: false,
                message: 'Level progress not found. Please access the level first before submitting.'
            });
        }

        levelProgress.attempts += 1;
        levelProgress.codeSubmitted = code;
        levelProgress.characterCountInCode = code.length;
        levelProgress.testCasesPassed = testResults.results
            .filter(r => r.passed)
            .map((_, index) => level.testCases[index]._id);
        
        if (allPassed) {
            levelProgress.isCompleted = true;
        }

        if (allPassed && !levelProgress.completedAt) {
            const completedTime = new Date();
            levelProgress.completedAt = completedTime;

            const startTime = new Date(levelProgress.startAt).getTime();
            const endTime = completedTime.getTime();
            levelProgress.timeTaken = endTime - startTime;

            if (!team.levelCompleted || team.levelCompleted < level.levelNumber) {
                team.levelCompleted = level.levelNumber;
                team.score += level.difficultyScore;
                await team.save();
                await CacheUtil.invalidateTeam(teamId);
            }
        }
        await levelProgress.save();

        res.status(200).json({
            success: true,
            message: allPassed ? 'All test cases passed!' : 'Some test cases failed',
            data: {
                allPassed,
                passedTestCases,
                totalTestCases,
                testResults: testResults.results,
                attempts: levelProgress.attempts,
                isCompleted: levelProgress.isCompleted,
            }
        });

    } catch (error) {
        console.error('Error submitting level:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error submitting level', 
            error: error.message 
        });
    }
};

module.exports = {
    submitLevel
};