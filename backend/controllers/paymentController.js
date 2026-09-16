const crypto = require('crypto');
const Razorpay = require('../config/razorpay');
const Pricing = require('../models/Pricing');
const Package = require('../models/Package');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');
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

exports.createCategoryOrder = async (req, res, next) => {
  try {
    const { packageId, category } = req.body || {};

    let targetPackage = null;
    let targetCategory = null;

    if (packageId) {
      targetPackage = await Package.findById(packageId).lean();
      if (!targetPackage) {
        targetPackage = await Pricing.findById(packageId).lean();
      }
    }

    if (!targetPackage && category) {
      const normCat = String(category).toUpperCase().trim();
      targetPackage = await Package.findOne({ category: normCat, isActive: true }).lean();
      if (!targetPackage) {
        targetPackage = await Pricing.findOne({ planType: 'ONE_TIME', category: normCat, isActive: true }).lean();
      }
    }

    if (!targetPackage) {
      const error = new Error('Package or category not found');
      error.statusCode = 404;
      throw error;
    }

    targetCategory = String(targetPackage.category || category).toUpperCase().trim();

    const priceInPaise = targetPackage.priceInPaise ||
      (targetPackage.price !== undefined ? Math.round(Number(targetPackage.price) * 100) : 0);

    if (!priceInPaise || priceInPaise <= 0) {
      const error = new Error('Invalid package price');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findById(req.user.id).lean();
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const order = await Razorpay.orders.create({
      amount: Number(priceInPaise),
      currency: targetPackage.currency || 'INR',
      receipt: `alphadrop_cat_${Date.now()}_${user._id.toString()}`,
      notes: {
        userId: user._id.toString(),
        type: 'ONE_TIME_PACKAGE',
        category: targetCategory
      }
    });

    res.status(201).json({
      success: true,
      data: {
        order,
        amountInPaise: priceInPaise,
        currency: targetPackage.currency || 'INR',
        category: targetCategory,
        package: {
          id: targetPackage._id,
          title: targetPackage.title || `${targetCategory} Package`,
          category: targetCategory,
          price: Number(priceInPaise) / 100
        },
        paymentMode: Razorpay.hasGatewayCredentials ? 'gateway' : 'mock'
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyPayment = async (req, res, next) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      type,
      category,
      planCycle,
      amountInPaise
    } = req.body || {};

    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('Unauthorized');
      error.statusCode = 401;
      throw error;
    }

    if (!razorpayOrderId || !razorpayPaymentId) {
      const error = new Error('Missing payment credentials');
      error.statusCode = 400;
      throw error;
    }

    if (Razorpay.hasGatewayCredentials && env.razorpayKeySecret && razorpaySignature) {
      const expectedSignature = crypto
        .createHmac('sha256', env.razorpayKeySecret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (expectedSignature !== razorpaySignature) {
        const error = new Error('Razorpay signature verification failed');
        error.statusCode = 400;
        throw error;
      }
    }

    const isOneTime = type === 'ONE_TIME_PACKAGE' || type === 'ONE_TIME' || Boolean(category);
    const targetCategory = category ? String(category).toUpperCase().trim() : null;

    let payment = await Payment.findOne({ razorpayPaymentId });
    if (!payment) {
      payment = await Payment.create({
        userId,
        paymentType: isOneTime ? 'ONE_TIME' : 'SUBSCRIPTION',
        planCycle: !isOneTime ? (planCycle || 'MONTHLY') : null,
        category: targetCategory,
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature: razorpaySignature || null,
        amountInPaise: amountInPaise || 0,
        currency: 'INR',
        status: 'SUCCESS'
      });
    }

    if (isOneTime && targetCategory) {
      await User.findByIdAndUpdate(userId, {
        $addToSet: {
          purchasedCategories: {
            category: targetCategory,
            orderId: razorpayOrderId,
            purchasedAt: new Date()
          }
        },
        $set: {
          hasOneTimeAccess: true
        }
      });

      await OneTime.findOneAndUpdate(
        { userId, category: targetCategory },
        {
          $set: {
            userId,
            category: targetCategory,
            isLifetimeActive: true,
            paymentId: payment._id
          }
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      return res.json({
        success: true,
        message: `Category ${targetCategory} unlocked successfully`,
        data: { category: targetCategory, orderId: razorpayOrderId, paymentId: payment._id }
      });
    }

    if (!isOneTime) {
      const cycle = planCycle || 'MONTHLY';
      const durationMonths = cycle === 'MONTHLY' ? 1 : cycle === 'SIX_MONTH' ? 6 : 12;
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
          planCycle: cycle,
          durationMonths,
          status: 'ACTIVE',
          startsAt,
          expiresAt,
          paymentId: payment._id
        });

        await User.findByIdAndUpdate(userId, {
          hasActiveSubscription: true,
          'subscription.status': 'active',
          'subscription.plan': cycle,
          'subscription.expiresAt': expiresAt
        });

        return res.json({ success: true, data: { subscription: sub, paymentId: payment._id } });
      }

      const sub = await Subscription.create({
        userId,
        planCycle: cycle,
        durationMonths,
        status: 'QUEUED',
        startsAt: null,
        expiresAt: null,
        paymentId: payment._id
      });

      return res.json({ success: true, data: { subscription: sub, paymentId: payment._id } });
    }

    res.json({ success: true, data: { payment } });
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
    const orderType = notes?.type || notes?.planType || 'ONE_TIME';
    const isOneTime = orderType === 'ONE_TIME_PACKAGE' || orderType === 'ONE_TIME';
    const planCycle = notes?.planCycle || null;
    const category = notes?.category ? String(notes.category).toUpperCase().trim() : null;
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
      paymentType: isOneTime ? 'ONE_TIME' : 'SUBSCRIPTION',
      planCycle: !isOneTime ? planCycle : null,
      category: isOneTime ? category : null,
      razorpayOrderId: order_id,
      razorpayPaymentId: id,
      amountInPaise: amount,
      currency: currency || 'INR',
      status: 'SUCCESS'
    });

    if (isOneTime && category) {
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

      // Use $addToSet to add { category: notes.category, orderId: payment.order_id } into user.purchasedCategories
      await User.findByIdAndUpdate(userId, {
        $addToSet: {
          purchasedCategories: {
            category: notes.category || category,
            orderId: order_id,
            purchasedAt: new Date()
          }
        },
        $set: {
          hasOneTimeAccess: true
        }
      });

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

      await User.findByIdAndUpdate(userId, {
        hasActiveSubscription: true,
        'subscription.status': 'active',
        'subscription.plan': planCycle,
        'subscription.expiresAt': expiresAt
      });

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
