const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    teamId:{
        type: String,
        required: true,
        unique: true
    },
    password:{
        type: String,
        required: true
    },
    score:{
        type: Number,
        default: 0
    },
    levelCompleted:{
        type: Number,
        default: 0
    },
    isActive:{
        type: Boolean,
        default: false
    },
    loginAt:{
        type: Date,
        default: Date.now
    },
},
{ timestamps: true }
);

module.exports = mongoose.model('Team', teamSchema);