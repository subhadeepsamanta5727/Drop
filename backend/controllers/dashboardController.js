const path = require('path');
const fs = require('fs');
const DailyContent = require('../models/DailyContent');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');

const monthAdd = (date, months) => {
  const next = new Date(date);
  return new Date(next.getFullYear(), next.getMonth() + months, next.getDate(), next.getHours(), next.getMinutes(), next.getSeconds(), next.getMilliseconds());
};

const normalizeDay = (date) => {
  const value = new Date(date);
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
};

const isWithinWindow = (publishDate, startsAt, expiresAt) => {
  const normalizedPublish = normalizeDay(publishDate);
  const normalizedStart = normalizeDay(startsAt);
  const normalizedEnd = normalizeDay(expiresAt);
  return normalizedPublish >= normalizedStart && normalizedPublish <= normalizedEnd;
};

const isContentEligibleForSubscription = (contentDate, windows = []) => {
  if (!windows || windows.length === 0) {
    return false;
  }

  return windows.some((window) => isWithinWindow(contentDate, window.startsAt, window.expiresAt));
};

const buildSubscriptionQuery = (windows = []) => {
  if (!windows || windows.length === 0) {
    return { _id: null };
  }

  const clauses = windows.map(({ startsAt, expiresAt }) => ({
    publishedAt: {
      $gte: new Date(startsAt),
      $lte: new Date(expiresAt)
    }
  }));

  return {
    $or: clauses
  };
};

exports.getSubscriptionSection = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const windows = req.entitlements?.subscriptionWindows || [];
    const hasActiveSubscription = Boolean(req.entitlements?.hasActiveSubscription);
    const subscriptionBaseQuery = {
      targetTier: { $in: ['SUBSCRIPTION', 'ALL'] }
    };

    // A current subscription unlocks only content in paid windows, including prior paid periods.
    // Content published during any lapse has no matching window and is never returned.
    const query = hasActiveSubscription && windows.length
      ? { ...subscriptionBaseQuery, ...buildSubscriptionQuery(windows) }
      : { ...subscriptionBaseQuery, _id: null };

    const pageNumber = Number(page) > 0 ? Number(page) : 1;
    const pageLimit = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (pageNumber - 1) * pageLimit;

    const [total, items] = await Promise.all([
      DailyContent.countDocuments(query),
      DailyContent.find(query)
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(pageLimit)
        .lean()
    ]);

    const filteredItems = items.filter((item) => isContentEligibleForSubscription(item.publishedAt, windows));

    res.json({
      success: true,
      data: {
        hasActiveSubscription,
        activeSubscription: req.entitlements?.activeSubscription || null,
        permissions: {
          lifetimeCategories: req.entitlements?.lifetimeCategories || []
        },
        subscriptionWindows: windows,
        items: filteredItems,
        pagination: {
          page: pageNumber,
          limit: pageLimit,
          total: filteredItems.length,
          totalDocuments: total
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getOneTimeSection = async (req, res, next) => {
  try {
    const categories = req.entitlements?.lifetimeCategories || [];
    const lifetimePurchaseAt = req.entitlements?.lifetimePurchaseAt;
    if (!req.entitlements?.hasOneTimeAccess || !lifetimePurchaseAt) {
      return res.json({
        success: true,
        data: {
          hasOneTimeAccess: false,
          categories: [],
          items: []
        }
      });
    }

    const items = await DailyContent.find({
      targetTier: { $in: ['ONE_TIME', 'ALL'] },
      publishedAt: { $gte: new Date(lifetimePurchaseAt) }
    }).sort({ publishedAt: -1 }).lean();

    return res.json({
      success: true,
      data: {
        hasOneTimeAccess: true,
        categories,
        items
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.downloadFile = async (req, res, next) => {
  try {
    const { contentId, fileId } = req.params;
    const content = await DailyContent.findById(contentId).lean();

    if (!content) {
      const error = new Error('Content not found');
      error.statusCode = 404;
      throw error;
    }

    const file = Array.isArray(content.files) ? content.files.find((item) => String(item._id) === String(fileId)) : null;
    if (!file) {
      const error = new Error('File not found');
      error.statusCode = 404;
      throw error;
    }

    const lifetimeCategories = req.entitlements?.lifetimeCategories || [];
    const lifetimePurchaseAt = req.entitlements?.lifetimePurchaseAt;
    const subscriptionWindows = req.entitlements?.subscriptionWindows || [];
    const hasLifetimeAccess = (content.targetTier === 'ONE_TIME' || content.targetTier === 'ALL')
      && Boolean(lifetimePurchaseAt)
      && new Date(content.publishedAt) >= new Date(lifetimePurchaseAt)
      && (lifetimeCategories.length > 0 || req.entitlements?.hasOneTimeAccess);

    const hasSubscriptionAccess = (content.targetTier === 'SUBSCRIPTION' || content.targetTier === 'ALL')
      && Boolean(req.entitlements?.hasActiveSubscription)
      && isContentEligibleForSubscription(content.publishedAt, subscriptionWindows);

    if (!hasLifetimeAccess && !hasSubscriptionAccess) {
      const isGapDay = (content.targetTier === 'SUBSCRIPTION' || content.targetTier === 'ALL')
        && (subscriptionWindows.length > 0)
        && !isContentEligibleForSubscription(content.publishedAt, subscriptionWindows);

      if (isGapDay) {
        const error = new Error('This content was published during a gap in your subscription access window.');
        error.code = 'GAP_DAY_LOCKED';
        error.statusCode = 403;
        throw error;
      }

      const error = new Error('You are not entitled to access this download');
      error.statusCode = 403;
      throw error;
    }

    if (file.cloudinaryUrl) {
      return res.redirect(file.cloudinaryUrl);
    }

    const storageFilePath = path.resolve(__dirname, '..', 'private_storage', file.fileKey);
    if (!fs.existsSync(storageFilePath)) {
      const error = new Error('File is unavailable on disk');
      error.statusCode = 404;
      throw error;
    }

    return res.sendFile(storageFilePath, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.originalFileName)}"`,
        'Content-Type': file.fileMimeType || 'application/octet-stream'
      }
    });
  } catch (error) {
    next(error);
  }
};
