const Level = require('../models/levels.model');
const Team = require('../models/team.model');
const TestCase = require('../models/testCases.model');
const LevelProgress = require('../models/levelProgress.model');

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
            difficultyScore
        } = req.body;

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
        const {id} =req.user;
        const team = await Team.findById(id).select('levelCompleted');
        const totalLevels = await Level.countDocuments();
        if(!team){
            return res.status(404).json({success:false, message: 'Team not found' });
        }
        const isMoreLevels = await Level.findOne({ levelNumber: Number(team.levelCompleted) + 1 });
        res.status(200).json({success:true, message: 'Levels fetched successfully' , count: totalLevels , currentLevel: team.levelCompleted , isMoreLevels: isMoreLevels ? true : false });
    } catch (error) {
        res.status(500).json({success:false, message: 'Error fetching levels', error: error});
        
    }
};

const getIndLevel = async(req,res)=>{
    try {
        const { levelId } = req.params;
        const level = await Level.findOne({ _id: levelId }).select('-testCases -hints');
        if(!level){
            return res.status(404).json({success:false, message: 'Level not found' });
        }
        res.status(200).json({success:true, data: level, message: 'Level fetched successfully' });
    } catch (error) {
        res.status(500).json({success:false, message: 'Error fetching level', error: error});
    }
};

const getTeamCurrentLevel = async(req,res)=>{
    try {
        const {id} =req.user;
        const team = await Team.findById(id).select('levelCompleted');
        const isMoreLevels = await Level.findOne({ levelNumber: Number(team.levelCompleted) + 1 });
        if(!team){
            return res.status(404).json({success:false, message: 'Team not found' , isMoreLevels: isMoreLevels ? true : false});
        }
        const currentLevelNumber = Number(team.levelCompleted) + 1 || 1;
        const level = await Level.findOne({levelNumber: currentLevelNumber}).select('-testCases -hints');
        
        if(!level){
            return res.status(404).json({success:false, message: 'No more levels available' , isMoreLevels: false});
        }
        
        const levelProgress = await LevelProgress.findOne({ teamId: id, levelId: level._id });
        if(!levelProgress){
            await LevelProgress.create({
                teamId: id,
                level: level.levelNumber,
                levelId: level._id,
                startAt: new Date(),
            });
        }

        res.status(200).json({success:true, data: level, message: 'Team current level fetched successfully' });
        
    } catch (error) {
        res.status(500).json({success:false, message: 'Error fetching team current level', error: error});
        
    }
};

const getHintsForLevel = async (req, res) => {
    try {
        const { id } = req.user;
        const team = await Team.findById(id).select('score levelCompleted');
        if (!team) {
            return res.status(404).json({ success: false, message: 'Team not found' });
        }
        
        const currentLevelNumber = team.levelCompleted.length + 1;
        const level = await Level.findOne({ levelNumber: currentLevelNumber }).select('hints');
        if (!level) {
            return res.status(404).json({ success: false, message: 'Level not found' });
        }
        if(level.hints.length === 0){
            return res.status(200).json({ success: true, data: [], message: 'No hints available for this level' });
        }
        const scoreToBeDeducted = process.env.HINT_SCORE_DEDUCTION || 5;
        team.score = Math.max(0, team.score - scoreToBeDeducted);
        await team.save();
        res.status(200).json({ success: true, data: level.hints, message: 'Hints fetched successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Error fetching hints', error: error });
    }
};

module.exports = {
    addLevel,
    getLevels,
    getIndLevel,
    getTeamCurrentLevel,
    getHintsForLevel
};