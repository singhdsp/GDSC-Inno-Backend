const express = require('express');
const router = express.Router();

const {authenticateTeam} = require('../middlewares/auth.middleware');

const {reportCheat} = require('../controllers/cheat.controller');

router.post('/report', authenticateTeam, reportCheat);

module.exports = router;