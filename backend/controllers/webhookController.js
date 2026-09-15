const crypto = require('crypto');
const env = require('../config/env');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');

exports.handleRazorpayWebhook = async (req, res, next) => {
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

    const existingPayment = await Payment.findOne({ razorpayPaymentId: id });
    if (existingPayment) {
      return res.status(200).json({ success: true, data: { acknowledged: true, paymentId: existingPayment._id } });
    }

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
      const expiresAt = new Date(startsAt.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);
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
