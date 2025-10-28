const express = require('express');
const router = express.Router();

const { getLeaderboard} = require('../controllers/leaderboard.controller');
const { authenticateTeam } = require('../middlewares/auth.middleware');
router.get('/', authenticateTeam, getLeaderboard);

module.exports = router;