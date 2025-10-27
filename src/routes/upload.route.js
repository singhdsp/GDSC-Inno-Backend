const express = require('express');
const router = express.Router();

const {uploadFile} = require('../controllers/upload.controller');
const {upload, uploadFileMiddleware} = require('../middlewares/upload.middleware');

router.post('/', upload.single('file'), uploadFileMiddleware, uploadFile);

module.exports = router;