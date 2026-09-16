const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');
const User = require('../models/User');

const toDate = (value) => (value ? new Date(value) : null);

const advanceQueue = async (userId) => {
  let user = await User.findById(userId);
  if (!user) return { hasActiveSubscription: false, activeSubscription: null, subscriptionWindows: [], lifetimeCategories: [] };

  const now = new Date();

  const activeSubscriptions = await Subscription.find({
    userId,
    status: 'ACTIVE'
  }).sort({ expiresAt: 1 }).lean();

  for (const subscription of activeSubscriptions) {
    if (subscription.expiresAt && new Date(subscription.expiresAt) <= now) {
      await Subscription.findByIdAndUpdate(subscription._id, { status: 'COMPLETED' });
    }
  }

  const validActiveSubs = await Subscription.find({
    userId,
    status: 'ACTIVE',
    startsAt: { $lte: now },
    expiresAt: { $gt: now }
  }).sort({ expiresAt: 1 }).lean();

  if (validActiveSubs.length > 0) {
    const active = validActiveSubs[0];
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      'subscription.status': 'active',
      'subscription.plan': active.planCycle,
      'subscription.expiresAt': active.expiresAt
    });
    return {
      hasActiveSubscription: true,
      activeSubscription: active,
      subscriptionWindows: validActiveSubs.map((item) => ({
        startsAt: item.startsAt,
        expiresAt: item.expiresAt
      })),
      lifetimeCategories: []
    };
  }

  const queued = await Subscription.find({ userId, status: 'QUEUED' }).sort({ createdAt: 1 }).lean();
  let previousExpiry = null;

  for (const item of queued) {
    const nextStartsAt = previousExpiry || now;
    const nextExpiresAt = new Date(nextStartsAt.getTime() + (item.durationMonths || 1) * 30 * 24 * 60 * 60 * 1000);

    await Subscription.findByIdAndUpdate(item._id, {
      status: 'ACTIVE',
      startsAt: previousExpiry ? previousExpiry : now,
      expiresAt: nextExpiresAt
    });

    previousExpiry = nextExpiresAt;
  }

  const refreshedActiveSubs = await Subscription.find({
    userId,
    status: 'ACTIVE',
    startsAt: { $lte: now },
    expiresAt: { $gt: now }
  }).sort({ expiresAt: 1 }).lean();

  if (refreshedActiveSubs.length > 0) {
    const active = refreshedActiveSubs[0];
    await User.findByIdAndUpdate(userId, {
      hasActiveSubscription: true,
      'subscription.status': 'active',
      'subscription.plan': active.planCycle,
      'subscription.expiresAt': active.expiresAt
    });
    return {
      hasActiveSubscription: true,
      activeSubscription: active,
      subscriptionWindows: refreshedActiveSubs.map((item) => ({
        startsAt: item.startsAt,
        expiresAt: item.expiresAt
      })),
      lifetimeCategories: []
    };
  }

  await User.findByIdAndUpdate(userId, {
    hasActiveSubscription: false,
    'subscription.status': 'inactive',
    'subscription.expiresAt': null
  });
  return {
    hasActiveSubscription: false,
    activeSubscription: null,
    subscriptionWindows: [],
    lifetimeCategories: []
  };
};

const verifyAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      const error = new Error('User context is required');
      error.statusCode = 401;
      throw error;
    }

    const [queueState, lifetimeRecords] = await Promise.all([
      advanceQueue(userId),
      OneTime.find({ userId, isLifetimeActive: true }).select('category createdAt').lean()
    ]);

    const user = await User.findById(userId).lean();
    const subscriptionQuery = await Subscription.find({
      userId,
      status: { $in: ['ACTIVE', 'COMPLETED'] }
    }).sort({ startsAt: 1 }).lean();

    const subscriptionWindows = subscriptionQuery
      .filter((sub) => sub.startsAt && sub.expiresAt)
      .map((sub) => ({
        startsAt: new Date(sub.startsAt),
        expiresAt: new Date(sub.expiresAt)
      }));

    // The current entitlement must come from a dated subscription record, never a stale user flag.
    const hasActiveSubscription = queueState.hasActiveSubscription;
    const userCategoryList = (user?.purchasedCategories || []).map((item) => String(item.category).toUpperCase());
    const lifetimeCategories = Array.from(new Set([
      ...(lifetimeRecords || []).map((item) => String(item.category).toUpperCase()),
      ...userCategoryList
    ]));
    const lifetimePurchaseAt = (lifetimeRecords || [])
      .map((item) => item.createdAt)
      .filter(Boolean)
      .sort((first, second) => new Date(first) - new Date(second))[0] ||
      (user?.purchasedCategories || [])
        .map((item) => item.purchasedAt)
        .filter(Boolean)
        .sort((first, second) => new Date(first) - new Date(second))[0] || null;
    const hasOneTimeAccess = Boolean(lifetimeCategories.length || (user && user.hasOneTimeAccess));

    req.entitlements = {
      userId,
      user,
      hasActiveSubscription,
      activeSubscription: queueState.activeSubscription || null,
      subscriptionWindows,
      lifetimeCategories,
      purchasedCategories: user?.purchasedCategories || [],
      lifetimePurchaseAt,
      hasOneTimeAccess
    };

    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = verifyAccess;
