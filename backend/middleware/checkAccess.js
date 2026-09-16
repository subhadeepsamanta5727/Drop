const User = require('../models/User');
const DailyContent = require('../models/DailyContent');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');

const checkAccess = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const now = new Date();

    // Check if user is an active subscriber
    const userSubActive = (
      user.subscription?.status === 'active' ||
      user.hasActiveSubscription === true
    ) && (
      !user.subscription?.expiresAt ||
      new Date(user.subscription.expiresAt) > now
    );

    const dbSubActive = await Subscription.exists({
      userId,
      status: 'ACTIVE',
      startsAt: { $lte: now },
      expiresAt: { $gt: now }
    });

    const isSubscriber = Boolean(userSubActive || dbSubActive || user.role === 'ADMIN');

    // Rule 1 (Subscriber Bypass): Active subscriber gets access to all files/categories
    if (isSubscriber) {
      req.accessContext = { isSubscriber: true, user };
      return next();
    }

    // Determine target category and access type from route params/query
    let targetCategory = req.params.category || req.query.category;
    let accessType = 'both';

    const contentId = req.params.contentId || req.params.id;
    if (contentId) {
      const content = await DailyContent.findById(contentId).lean();
      if (!content) {
        return res.status(404).json({
          success: false,
          error: 'Content not found'
        });
      }
      targetCategory = content.category;
      accessType = content.contentType === 'SUBSCRIPTION_DAILY'
        ? 'subscription_only'
        : content.contentType === 'ONE_TIME_CATEGORY'
        ? 'one_time_category'
        : content.accessType || (content.targetTier === 'SUBSCRIPTION' ? 'subscription_only' : 'both');
      req.targetContent = content;
    }

    // If content is marked subscription_only, non-subscribers cannot access
    if (accessType === 'subscription_only') {
      return res.status(403).json({
        error: 'Purchase this category package or subscribe to access.'
      });
    }

    // Rule 2 (One-Time Package Check): If not subscribed, check if user.purchasedCategories contains the file category
    if (targetCategory) {
      const normalizedCategory = String(targetCategory).toUpperCase();

      const userPurchased = Array.isArray(user.purchasedCategories) &&
        user.purchasedCategories.some((item) => String(item.category).toUpperCase() === normalizedCategory);

      const oneTimeExists = await OneTime.exists({
        userId,
        category: normalizedCategory,
        isLifetimeActive: true
      });

      if (userPurchased || oneTimeExists) {
        req.accessContext = { isSubscriber: false, hasCategory: true, category: normalizedCategory, user };
        return next();
      }
    }

    // Rule 3: Otherwise, return 403 Forbidden
    return res.status(403).json({
      error: 'Purchase this category package or subscribe to access.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = checkAccess;
