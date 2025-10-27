const express = require('express');
const { login , currentSession } = require('../controllers/auth.controller');
const { authenticateTeam } = require('../middlewares/auth.middleware');
const router = express.Router();

router.post('/login', login);
router.get('/session', authenticateTeam, currentSession);

module.exports = router;