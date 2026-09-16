const express = require('express');
const {
  getContentFeed,
  getSubscriptionSection,
  getOneTimeSection,
  downloadFile
} = require('../controllers/dashboardController');
const verifyToken = require('../middleware/verifyToken');
const verifyAccess = require('../middleware/verifyAccess');
const checkAccess = require('../middleware/checkAccess');

const router = express.Router();

router.use(verifyToken, verifyAccess);
router.get('/feed', getContentFeed);
router.get('/content', getContentFeed);
router.get('/subscription', getSubscriptionSection);
router.get('/onetime', getOneTimeSection);
router.get('/download/:contentId/:fileId', checkAccess, downloadFile);

module.exports = router;
