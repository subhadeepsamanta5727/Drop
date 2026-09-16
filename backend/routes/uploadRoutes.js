const express = require('express');
const { upload } = require('../config/upload');
const { uploadDailyContent } = require('../controllers/adminController');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');

const router = express.Router();

router.post('/', verifyToken, verifyAdmin, upload.array('files', 15), uploadDailyContent);

module.exports = router;
