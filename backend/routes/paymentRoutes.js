const express = require('express');
const { createOrder, getPlans, getMyPayments } = require('../controllers/paymentController');
const verifyToken = require('../middleware/verifyToken');

const router = express.Router();

router.get('/plans', getPlans);
router.post('/create-order', verifyToken, createOrder);
router.get('/my-payments', verifyToken, getMyPayments);

module.exports = router;
