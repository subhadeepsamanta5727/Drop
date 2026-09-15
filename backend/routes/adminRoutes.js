const express = require('express');
const { upload } = require('../config/upload');
const verifyToken = require('../middleware/verifyToken');
const verifyAdmin = require('../middleware/verifyAdmin');
const {
  getAdminOverview,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getPricingPlans,
  createPricingPlan,
  updatePricingPlan,
  deletePricingPlan,
  getPayments,
  createPayment,
  updatePayment,
  deletePayment,
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  getOneTimeAccess,
  createOneTimeAccess,
  updateOneTimeAccess,
  deleteOneTimeAccess,
  getDailyContents,
  downloadDailyContentFile,
  createDailyContentRecord,
  updateDailyContentRecord,
  deleteDailyContentRecord,
  uploadDailyContent,
} = require('../controllers/adminController');

const router = express.Router();

router.use(verifyToken, verifyAdmin);
router.get('/overview', getAdminOverview);

router.get('/users', getUsers);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

router.get('/pricing', getPricingPlans);
router.post('/pricing', createPricingPlan);
router.put('/pricing/:id', updatePricingPlan);
router.delete('/pricing/:id', deletePricingPlan);

router.get('/payments', getPayments);
router.post('/payments', createPayment);
router.put('/payments/:id', updatePayment);
router.delete('/payments/:id', deletePayment);

router.get('/subscriptions', getSubscriptions);
router.post('/subscriptions', createSubscription);
router.put('/subscriptions/:id', updateSubscription);
router.delete('/subscriptions/:id', deleteSubscription);

router.get('/onetime', getOneTimeAccess);
router.post('/onetime', createOneTimeAccess);
router.put('/onetime/:id', updateOneTimeAccess);
router.delete('/onetime/:id', deleteOneTimeAccess);

router.get('/daily-content', getDailyContents);
router.get('/daily-content/:contentId/files/:fileId/download', downloadDailyContentFile);
router.post('/daily-content', createDailyContentRecord);
router.put('/daily-content/:id', updateDailyContentRecord);
router.delete('/daily-content/:id', deleteDailyContentRecord);
router.post('/upload-daily', upload.array('files', 15), uploadDailyContent);

module.exports = router;
