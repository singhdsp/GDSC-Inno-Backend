const mongoose = require('mongoose');
const levelProgressSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
    level:{
        type: Number,
        required: true,
    },
    levelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Level'
    },
    startAt:{
        type: Date,
        default: Date.now
    },
    completedAt:{
        type: Date,
    },
    codeSubmitted:{
        type:String,
    },
    characterCountInCode:{
        type: Number,
    },
    timeTaken:{
        type: Number,
    },
    attempts:{
        type: Number,
        default: 0
    },
    testCasesPassed:[{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TestCase'
    }],
    perTestCasesPassed:{
        type: Number,
    },
    isCompleted:{
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('LevelProgress', levelProgressSchema);
