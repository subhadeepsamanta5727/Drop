const crypto = require('crypto');
const Razorpay = require('../config/razorpay');
const Pricing = require('../models/Pricing');
const User = require('../models/User');
const Payment = require('../models/Payment');
const env = require('../config/env');

const VALID_SUBSCRIPTION_CYCLES = {
  MONTHLY: 1,
  SIX_MONTH: 6,
  YEARLY: 12
};

const getPricingRecord = async ({ planType, planCycle, category }) => {
  if (!planType || !['ONE_TIME', 'SUBSCRIPTION'].includes(planType)) {
    const error = new Error('Invalid planType');
    error.statusCode = 400;
    throw error;
  }

  if (planType === 'SUBSCRIPTION') {
    if (!planCycle || !VALID_SUBSCRIPTION_CYCLES[planCycle]) {
      const error = new Error('A valid subscription cycle is required');
      error.statusCode = 400;
      throw error;
    }

    return Pricing.findOne({
      planType: 'SUBSCRIPTION',
      planCycle,
      isActive: true
    }).lean();
  }

  if (!category) {
    const error = new Error('Category is required for one-time purchase');
    error.statusCode = 400;
    throw error;
  }

  return Pricing.findOne({
    planType: 'ONE_TIME',
    category: String(category).toUpperCase(),
    isActive: true
  }).lean();
};

exports.getPlans = async (req, res, next) => {
  try {
    const pricing = await Pricing.find({}).sort({ planType: 1, planCycle: 1, category: 1 }).lean();

    res.json({
      success: true,
      data: pricing,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

exports.createOrder = async (req, res, next) => {
  try {
    const { planType, planCycle, category } = req.body || {};
    const pricing = await getPricingRecord({ planType, planCycle, category });

    if (!pricing) {
      const error = new Error('No pricing configuration found for the selected plan');
      error.statusCode = 404;
      throw error;
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const order = await Razorpay.orders.create({
      amount: Number(pricing.priceInPaise),
      currency: pricing.currency || 'INR',
      receipt: `alphadrop_${Date.now()}_${user._id.toString()}`,
      notes: {
        userId: user._id.toString(),
        planType,
        planCycle: planType === 'SUBSCRIPTION' ? planCycle : null,
        category: planType === 'ONE_TIME' ? String(category).toUpperCase() : null
      }
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        amountInPaise: pricing.priceInPaise,
        currency: pricing.currency || 'INR',
        paymentMode: Razorpay.hasGatewayCredentials ? 'gateway' : 'mock'
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.webhook = async (req, res, next) => {
  try {
    const secret = env.razorpayWebhookSecret;
    const signature = req.headers['x-razorpay-signature'];
    const rawBody = req.rawBody || req.body;

    if (!secret || !signature || !rawBody) {
      const error = new Error('Invalid Razorpay webhook request');
      error.statusCode = 400;
      throw error;
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      const error = new Error('Razorpay signature verification failed');
      error.statusCode = 400;
      throw error;
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    const paymentEntity = event?.payload?.payment?.entity;

    if (!paymentEntity) {
      const error = new Error('Missing payment entity in Razorpay payload');
      error.statusCode = 400;
      throw error;
    }

    const { id, order_id, amount, currency, notes } = paymentEntity;
    const planType = notes?.planType || 'ONE_TIME';
    const planCycle = notes?.planCycle || null;
    const category = notes?.category ? String(notes.category).toUpperCase() : null;
    const userId = notes?.userId;

    if (!userId) {
      const error = new Error('Webhook payload is missing userId');
      error.statusCode = 400;
      throw error;
    }

    const existingPayment = await require('../models/Payment').findOne({ razorpayPaymentId: id });
    if (existingPayment) {
      return res.status(200).json({ success: true, data: { acknowledged: true, paymentId: existingPayment._id } });
    }

    const Payment = require('../models/Payment');
    const User = require('../models/User');
    const Subscription = require('../models/Subscription');
    const OneTime = require('../models/OneTime');
    const payment = await Payment.create({
      userId,
      paymentType: planType,
      planCycle,
      category,
      razorpayOrderId: order_id,
      razorpayPaymentId: id,
      amountInPaise: amount,
      currency: currency || 'INR',
      status: 'SUCCESS'
    });

    if (planType === 'ONE_TIME') {
      const oneTimeDoc = await OneTime.findOneAndUpdate(
        { userId, category },
        {
          $set: {
            userId,
            category,
            isLifetimeActive: true,
            paymentId: payment._id
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      await User.findByIdAndUpdate(userId, { hasOneTimeAccess: true });

      return res.status(200).json({
        success: true,
        data: { acknowledged: true, paymentId: payment._id, oneTime: oneTimeDoc }
      });
    }

    const durationMonths = planCycle === 'MONTHLY' ? 1 : planCycle === 'SIX_MONTH' ? 6 : 12;
    const hasActiveSubscription = await Subscription.exists({
      userId,
      status: 'ACTIVE',
      expiresAt: { $gt: new Date() }
    });

    if (!hasActiveSubscription) {
      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getFullYear(), startsAt.getMonth() + durationMonths, startsAt.getDate(), startsAt.getHours(), startsAt.getMinutes(), startsAt.getSeconds(), startsAt.getMilliseconds());
      const sub = await Subscription.create({
        userId,
        planCycle,
        durationMonths,
        status: 'ACTIVE',
        startsAt,
        expiresAt,
        paymentId: payment._id
      });

      await User.findByIdAndUpdate(userId, { hasActiveSubscription: true });

      return res.status(200).json({ success: true, data: { acknowledged: true, subscription: sub } });
    }

    const sub = await Subscription.create({
      userId,
      planCycle,
      durationMonths,
      status: 'QUEUED',
      startsAt: null,
      expiresAt: null,
      paymentId: payment._id
    });

    await User.findByIdAndUpdate(userId, { hasActiveSubscription: true });

    return res.status(200).json({ success: true, data: { acknowledged: true, subscription: sub } });
  } catch (error) {
    next(error);
  }
};
