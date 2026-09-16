const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDb = require('../config/db');
const User = require('../models/User');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');

const DEMO_EMAIL = 'demo@alphadrop.com';
const DEMO_PASSWORD = 'Demo@12345';
const DEMO_CATEGORIES = ['CRYPTO', 'STOCKS'];

const addMonths = (date, months) => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const upsertPayment = async ({ userId, paymentType, category, planCycle, paymentId, orderId, amountInPaise }) => Payment.findOneAndUpdate(
  { razorpayPaymentId: paymentId },
  {
    $set: {
      userId,
      paymentType,
      category: category || null,
      planCycle: planCycle || null,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      amountInPaise,
      currency: 'INR',
      status: 'SUCCESS'
    }
  },
  { upsert: true, new: true, setDefaultsOnInsert: true }
);

const seed = async () => {
  await connectDb();

  const password = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await User.findOneAndUpdate(
    { email: DEMO_EMAIL },
    {
      $set: {
        name: 'AlphaDrop Demo User',
        email: DEMO_EMAIL,
        password,
        role: 'USER',
        hasActiveSubscription: true,
        hasOneTimeAccess: true,
        'subscription.plan': 'MONTHLY',
        'subscription.status': 'active'
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const startsAt = new Date();
  const expiresAt = addMonths(startsAt, 1);
  const subscriptionPayment = await upsertPayment({
    userId: user._id,
    paymentType: 'SUBSCRIPTION',
    planCycle: 'MONTHLY',
    paymentId: 'demo_subscription_payment_monthly',
    orderId: 'demo_subscription_order_monthly',
    amountInPaise: 99900
  });

  await Subscription.findOneAndUpdate(
    { userId: user._id, paymentId: subscriptionPayment._id },
    {
      $set: {
        userId: user._id,
        planCycle: 'MONTHLY',
        durationMonths: 1,
        status: 'ACTIVE',
        startsAt,
        expiresAt,
        paymentId: subscriptionPayment._id
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const purchasedCategories = [];
  for (const [index, category] of DEMO_CATEGORIES.entries()) {
    const payment = await upsertPayment({
      userId: user._id,
      paymentType: 'ONE_TIME',
      category,
      paymentId: `demo_onetime_payment_${category.toLowerCase()}`,
      orderId: `demo_onetime_order_${category.toLowerCase()}`,
      amountInPaise: 49900
    });

    await OneTime.findOneAndUpdate(
      { userId: user._id, category },
      {
        $set: {
          userId: user._id,
          category,
          isLifetimeActive: true,
          paymentId: payment._id
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    purchasedCategories.push({
      category,
      orderId: `demo_onetime_order_${category.toLowerCase()}`,
      purchasedAt: new Date(Date.now() - index * 60 * 60 * 1000)
    });
  }

  await User.findByIdAndUpdate(user._id, {
    $set: {
      hasActiveSubscription: true,
      hasOneTimeAccess: true,
      'subscription.plan': 'MONTHLY',
      'subscription.status': 'active',
      'subscription.expiresAt': expiresAt,
      purchasedCategories
    }
  });

  console.log(JSON.stringify({
    success: true,
    userId: user._id.toString(),
    email: DEMO_EMAIL,
    password: DEMO_PASSWORD,
    subscription: { plan: 'MONTHLY', startsAt, expiresAt },
    purchasedCategories: DEMO_CATEGORIES
  }, null, 2));
};

seed()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
