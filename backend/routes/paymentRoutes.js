const express = require('express');
const {
  createOrder,
  createCategoryOrder,
  verifyPayment,
  getPlans,
  getMyPayments,
  webhook
} = require('../controllers/paymentController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.get('/plans', getPlans);
router.post('/create-order', verifyToken, createOrder);
router.post('/create-category-order', verifyToken, createCategoryOrder);
router.post('/verify', verifyToken, verifyPayment);
router.get('/my-payments', verifyToken, getMyPayments);
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

module.exports = router;
