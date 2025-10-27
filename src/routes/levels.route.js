const express = require('express');
const router = express.Router();

const { addLevel, getLevels, getIndLevel, getTeamCurrentLevel, getHintsForLevel } = require('../controllers/levels.controller');
const { authenticateTeam } = require('../middlewares/auth.middleware');

router.post('/add', addLevel);
router.get('/', getLevels);
router.get('/:levelId', getIndLevel);
router.get('/team/current', authenticateTeam, getTeamCurrentLevel);
router.get('/team/hints', authenticateTeam, getHintsForLevel);

module.exports = router;