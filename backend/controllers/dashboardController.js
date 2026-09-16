const path = require('path');
const fs = require('fs');
const DailyContent = require('../models/DailyContent');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');
const User = require('../models/User');

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

exports.getContentFeed = async (req, res, next) => {
  try {
    const {
      category,
      contentType = 'SUBSCRIPTION_DAILY',
      dateFilter = 'ALL',
      page = 1,
      limit = 10
    } = req.query;
    const userId = req.user?.id;
    const user = await User.findById(userId).lean();

    const now = new Date();
    const isSubscriber = Boolean(
      req.entitlements?.hasActiveSubscription ||
      user?.role === 'ADMIN' ||
      (user?.subscription?.status === 'active' && (!user.subscription?.expiresAt || new Date(user.subscription.expiresAt) > now))
    );

    const purchasedCategories = Array.from(new Set([
      ...(user?.purchasedCategories || []).map((c) => String(c.category).toUpperCase()),
      ...(req.entitlements?.lifetimeCategories || [])
    ]));

    const normalizedContentType = String(contentType).toUpperCase().trim();
    const contentTypeQuery = normalizedContentType === 'ONE_TIME_CATEGORY'
      ? {
          $or: [
            { contentType: 'ONE_TIME_CATEGORY' },
            { contentType: null, targetTier: 'ONE_TIME' }
          ]
        }
      : {
          $or: [
            { contentType: 'SUBSCRIPTION_DAILY' },
            { contentType: null, targetTier: 'SUBSCRIPTION' }
          ]
        };
    const requestedDateFilter = String(dateFilter).toUpperCase();
    const normalizedDateFilter = ['TODAY', 'LAST_7_DAYS'].includes(requestedDateFilter)
      ? requestedDateFilter
      : 'ALL';
    const pageNumber = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);
    const shouldPaginate = normalizedContentType === 'SUBSCRIPTION_DAILY';
    const query = { $and: [contentTypeQuery] };

    if (normalizedContentType === 'SUBSCRIPTION_DAILY') {
      const subscriptionWindows = req.entitlements?.subscriptionWindows || [];
      const windowClauses = subscriptionWindows
        .filter((window) => window.startsAt && window.expiresAt)
        .map((window) => ({
          publishedAt: {
            $gte: new Date(window.startsAt),
            $lte: new Date(window.expiresAt)
          }
        }));

      if (windowClauses.length === 0) {
        query.$and.push({ _id: null });
      } else {
        if (normalizedDateFilter === 'TODAY' || normalizedDateFilter === 'LAST_7_DAYS') {
          const rangeStart = normalizedDateFilter === 'TODAY'
            ? new Date(now)
            : new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
          if (normalizedDateFilter === 'TODAY') rangeStart.setHours(0, 0, 0, 0);
          windowClauses.forEach((clause) => {
            clause.publishedAt.$gte = new Date(Math.max(clause.publishedAt.$gte.getTime(), rangeStart.getTime()));
            clause.publishedAt.$lte = new Date(Math.min(clause.publishedAt.$lte.getTime(), now.getTime()));
          });
        }
        query.$and.push({ $or: windowClauses });
      }
    } else {
      query.$and.push({
        publishedAt: {
          $gte: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)),
          $lte: now
        }
      });
    }

    if (normalizedDateFilter === 'TODAY' && normalizedContentType !== 'SUBSCRIPTION_DAILY') {
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      query.$and.push({ publishedAt: { $gte: todayStart, $lte: now } });
    }
    if (category && category !== 'ALL') {
      query.category = String(category).toUpperCase().trim();
    }

    const total = await DailyContent.countDocuments(query);
    const items = await DailyContent.find(query)
      .sort({ publishedAt: -1 })
      .skip(shouldPaginate ? (pageNumber - 1) * pageLimit : 0)
      .limit(shouldPaginate ? pageLimit : 0)
      .lean();

    const subscriptionWindows = req.entitlements?.subscriptionWindows || [];
    const isPublishedDuringSubscription = (publishedAt) => subscriptionWindows.some((window) => {
      const publishedTime = new Date(publishedAt).getTime();
      return publishedTime >= new Date(window.startsAt).getTime() && publishedTime <= new Date(window.expiresAt).getTime();
    });

    const enrichedItems = items.map((item) => {
      const itemCategory = String(item.category || 'GENERAL').toUpperCase();
      const contentType = item.contentType || (
        item.accessType === 'one_time_category'
          ? 'ONE_TIME_CATEGORY'
          : item.accessType === 'subscription_only'
          ? 'SUBSCRIPTION_DAILY'
          : null
      );
      const isSubOnly = contentType === 'SUBSCRIPTION_DAILY' || item.accessType === 'subscription_only' || item.targetTier === 'SUBSCRIPTION';

      let hasAccess = false;
      if (isSubscriber || (contentType === 'SUBSCRIPTION_DAILY' && isPublishedDuringSubscription(item.publishedAt))) {
        hasAccess = true;
      } else if (!isSubOnly && purchasedCategories.includes(itemCategory)) {
        hasAccess = true;
      }

      return {
        ...item,
        category: itemCategory,
        contentType,
        accessType: item.accessType || (item.targetTier === 'SUBSCRIPTION' ? 'subscription_only' : 'both'),
        hasAccess
      };
    });

    res.json({
      success: true,
      data: {
        isSubscriber,
        hasActiveSubscription: isSubscriber,
        contentType: normalizedContentType,
        dateFilter: normalizedDateFilter,
        pagination: {
          page: pageNumber,
          limit: pageLimit,
          total,
          totalPages: Math.ceil(total / pageLimit)
        },
        purchasedCategories,
        hasOneTimeAccess: Boolean(purchasedCategories.length || user?.hasOneTimeAccess),
        items: enrichedItems,
        total: enrichedItems.length
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

    const userId = req.user?.id;
    const user = await User.findById(userId).lean();
    const now = new Date();

    // Rule 1 (Subscriber Bypass): Active subscriber gets access to all files/categories
    const isSubscriber = Boolean(
      req.accessContext?.isSubscriber ||
      req.entitlements?.hasActiveSubscription ||
      user?.role === 'ADMIN' ||
      (user?.subscription?.status === 'active' && (!user.subscription?.expiresAt || new Date(user.subscription.expiresAt) > now))
    );

    if (!isSubscriber) {
      const fileCategory = String(content.category || 'GENERAL').toUpperCase().trim();
      const isSubOnly = content.contentType === 'SUBSCRIPTION_DAILY' || content.accessType === 'subscription_only' || content.targetTier === 'SUBSCRIPTION';

      if (isSubOnly) {
        return res.status(403).json({
          error: 'Purchase this category package or subscribe to access.'
        });
      }

      // Rule 2 (One-Time Package Check): Check if user.purchasedCategories contains the file category
      const userPurchased = Array.isArray(user?.purchasedCategories) &&
        user.purchasedCategories.some((item) => String(item.category).toUpperCase().trim() === fileCategory);

      const hasLifetimeEntitlement = (req.entitlements?.lifetimeCategories || []).includes(fileCategory);

      const hasOneTimeInDb = await OneTime.exists({
        userId,
        category: fileCategory,
        isLifetimeActive: true
      });

      if (!userPurchased && !hasLifetimeEntitlement && !hasOneTimeInDb) {
        // Rule 3: Otherwise return 403 Forbidden with exact required message
        return res.status(403).json({
          error: 'Purchase this category package or subscribe to access.'
        });
      }
    }

    // Keep cloud-hosted downloads on the authenticated API origin. A redirect to
    // Cloudinary makes browser XHR downloads depend on that origin's CORS policy
    // and can otherwise surface as Axios' opaque "Network Error".
    if (file.cloudinaryUrl) {
      let upstream;
      try {
        upstream = await fetch(file.cloudinaryUrl);
      } catch (cause) {
        const error = new Error('Cloud file is temporarily unavailable');
        error.statusCode = 502;
        error.cause = cause;
        throw error;
      }

      if (!upstream.ok) {
        const error = new Error('Cloud file is unavailable');
        error.statusCode = 502;
        throw error;
      }

      const binary = Buffer.from(await upstream.arrayBuffer());
      return res.status(200).set({
        'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(file.originalFileName || 'attachment'))}"`,
        'Content-Type': upstream.headers.get('content-type') || file.fileMimeType || 'application/octet-stream',
        'Content-Length': binary.length
      }).send(binary);
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
