const mongoose = require('mongoose');

const levelSchema = new mongoose.Schema({
    levelNumber:{
        type: Number,
        required: true,
        unique: true
    },
    title:{
        type: String,
        required: true
    },
    description:{
        type: String,
        required: true
    },
    languageId:{
        type: Number,
        required: true
    },
    language:{
        type: String,
        required: true
    },
    codeTemplate:{
        type: String,
    },
    testCases:{
        type: [String],
        required: true
    },
    hints:{
        type: [String],
    },
    difficulty:{
        type: String,
        enum: ['Easy', 'Medium', 'Hard'],
        required: true
    },
    difficultyScore:{
        type: Number,
        required: true
    }
},
{ timestamps: true });