const express = require('express');
const router = express.Router();
const { clearAllCache, clearTeamCache, clearLevelCache, clearLeaderboardCache } = require('../controllers/cache.controller');

router.get('/clear/all', clearAllCache);
router.get('/clear/teams', clearTeamCache);
router.get('/clear/levels', clearLevelCache);
router.get('/clear/leaderboard', clearLeaderboardCache);

module.exports = router;
