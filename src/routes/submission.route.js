const express = require('express');
const router = express.Router();

const { submitLevel } = require('../controllers/submission.controller');
const { authenticateTeam } = require('../middlewares/auth.middleware');

router.post('/submit', authenticateTeam, submitLevel);

module.exports = router;