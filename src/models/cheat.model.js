const mongoose = require('mongoose');

const cheatSchema = new mongoose.Schema({
    teamId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Team'
    },
});

module.exports = mongoose.model('Cheat', cheatSchema);