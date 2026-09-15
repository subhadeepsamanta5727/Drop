const express = require('express');
const { getSubscriptionSection, getOneTimeSection, downloadFile } = require('../controllers/dashboardController');
const verifyToken = require('../middleware/verifyToken');
const verifyAccess = require('../middleware/verifyAccess');

const router = express.Router();

router.use(verifyToken, verifyAccess);
router.get('/subscription', getSubscriptionSection);
router.get('/onetime', getOneTimeSection);
router.get('/download/:contentId/:fileId', downloadFile);

module.exports = router;
