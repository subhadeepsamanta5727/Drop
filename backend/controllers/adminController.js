const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const DailyContent = require('../models/DailyContent');
const Package = require('../models/Package');
const Category = require('../models/Category');
const Pricing = require('../models/Pricing');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const Payment = require('../models/Payment');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');
const { cloudinary, hasCloudinaryCredentials } = require('../config/cloudinary');
const { storageDir } = require('../config/upload');

const buildCloudinaryAsset = (file) => new Promise((resolve, reject) => {
  if (!file || !file.buffer) {
    resolve(null);
    return;
  }

  if (!hasCloudinaryCredentials()) {
    resolve(null);
    return;
  }

  const stream = cloudinary.uploader.upload_stream(
    {
      folder: 'alphadrop/daily',
      resource_type: 'auto',
    },
    (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        url: result?.secure_url || result?.url || '',
        publicId: result?.public_id || '',
      });
    }
  );

  stream.end(file.buffer);
});

const buildLocalAsset = async (file) => {
  const safeName = String(file.originalname || 'attachment')
    .replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}-${crypto.randomUUID()}-${safeName}`;
  await fs.promises.writeFile(path.join(storageDir, fileName), file.buffer);

  return {
    url: null,
    publicId: null,
    fileKey: fileName,
  };
};

exports.getAdminOverview = async (req, res, next) => {
  try {
    const [userCount, pricingCount, subscriptionCount, oneTimeCount, paymentCount, contentCount] = await Promise.all([
      User.countDocuments(),
      Pricing.countDocuments(),
      Subscription.countDocuments({ status: 'ACTIVE' }),
      OneTime.countDocuments(),
      Payment.countDocuments({ paymentType: 'SUBSCRIPTION' }),
      DailyContent.countDocuments(),
    ]);

    res.json({
      success: true,
      data: {
        userCount,
        pricingCount,
        subscriptionCount,
        oneTimeCount,
        paymentCount,
        contentCount,
        admin: {
          id: req.user.id,
          role: req.user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find({}).select('-password').sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

exports.getPricingPlans = async (req, res, next) => {
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

exports.getPayments = async (req, res, next) => {
  try {
    const payments = await Payment.find({}).sort({ createdAt: -1 }).lean();
    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadDailyContent = async (req, res, next) => {
  try {
    const files = Array.isArray(req.files) ? req.files : [];

    if (files.length < 1) {
      const error = new Error('At least 1 file is required for daily content');
      error.statusCode = 400;
      throw error;
    }

    const { title, notes, link, targetTier, category, accessType, contentType } = req.body || {};

    if (!title) {
      const error = new Error('Title is required');
      error.statusCode = 400;
      throw error;
    }

    if (!category) {
      const error = new Error('Category is required. Please select a category for this upload.');
      error.statusCode = 400;
      throw error;
    }

    let normalizedContentType = contentType ? String(contentType).toUpperCase().trim() : null;
    if (!normalizedContentType && accessType === 'one_time_category') {
      normalizedContentType = 'ONE_TIME_CATEGORY';
    } else if (!normalizedContentType && accessType === 'subscription_only') {
      normalizedContentType = 'SUBSCRIPTION_DAILY';
    }
    if (normalizedContentType && !['SUBSCRIPTION_DAILY', 'ONE_TIME_CATEGORY'].includes(normalizedContentType)) {
      const error = new Error('Invalid content type');
      error.statusCode = 400;
      throw error;
    }

    const normalizedCategory = String(category).toUpperCase().trim();
    const categoryType = normalizedContentType === 'ONE_TIME_CATEGORY'
      ? 'ONE_TIME_CATEGORY'
      : 'SUBSCRIPTION_DAILY';
    const categoryRecord = await Category.findOne({
      category: normalizedCategory,
      categoryType,
      isActive: true
    }).lean();

    if (!categoryRecord) {
      const error = new Error('Category must match an active category catalog entry');
      error.statusCode = 400;
      throw error;
    }

    let normalizedAccessType = accessType ? String(accessType).toLowerCase().trim() : null;
    let normalizedTargetTier = targetTier ? String(targetTier).toUpperCase().trim() : null;

    if (normalizedContentType === 'SUBSCRIPTION_DAILY') {
      normalizedAccessType = 'subscription_only';
      normalizedTargetTier = 'SUBSCRIPTION';
    } else if (normalizedContentType === 'ONE_TIME_CATEGORY') {
      normalizedAccessType = 'one_time_category';
      normalizedTargetTier = 'ONE_TIME';
    }

    if (normalizedAccessType) {
      if (!['subscription_only', 'one_time_category', 'both'].includes(normalizedAccessType)) {
        normalizedAccessType = 'both';
      }
      if (normalizedAccessType === 'subscription_only') normalizedTargetTier = 'SUBSCRIPTION';
      else if (normalizedAccessType === 'one_time_category') normalizedTargetTier = 'ONE_TIME';
      else if (normalizedAccessType === 'both') normalizedTargetTier = 'ALL';
    } else if (normalizedTargetTier) {
      if (!['ONE_TIME', 'SUBSCRIPTION', 'ALL'].includes(normalizedTargetTier)) {
        normalizedTargetTier = 'ALL';
      }
      if (normalizedTargetTier === 'SUBSCRIPTION') normalizedAccessType = 'subscription_only';
      else if (normalizedTargetTier === 'ONE_TIME') normalizedAccessType = 'one_time_category';
      else if (normalizedTargetTier === 'ALL') normalizedAccessType = 'both';
    } else {
      normalizedAccessType = 'both';
      normalizedTargetTier = 'ALL';
    }

    const uploadedFileAssets = await Promise.all(
      files.map(async (file) => {
        const cloudAsset = await buildCloudinaryAsset(file);
        const asset = cloudAsset || await buildLocalAsset(file);

        return {
          label: file.originalname || 'Attachment',
          fileKey: asset.fileKey || asset.publicId || asset.url || file.originalname,
          cloudinaryPublicId: asset.publicId || null,
          cloudinaryUrl: asset.url || null,
          originalFileName: file.originalname,
          fileMimeType: file.mimetype || 'application/octet-stream',
          fileSizeBytes: file.size || 0,
        };
      })
    );

    const uploadedContent = await DailyContent.create({
      title: String(title).trim(),
      notes: notes ? String(notes).trim() : '',
      link: link ? String(link).trim() : '',
      category: normalizedCategory,
      contentType: normalizedContentType,
      accessType: normalizedAccessType,
      targetTier: normalizedTargetTier,
      files: uploadedFileAssets,
      uploadedBy: req.user.id,
      publishedAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        content: uploadedContent,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.createPricingPlan = async (req, res, next) => {
  try {
    const { planType, planCycle, category, durationMonths, priceInPaise, currency, isActive } = req.body || {};

    if (!planType || !['ONE_TIME', 'SUBSCRIPTION'].includes(String(planType).toUpperCase())) {
      const error = new Error('Valid planType is required: ONE_TIME or SUBSCRIPTION');
      error.statusCode = 400;
      throw error;
    }

    const normalizedPlanType = String(planType).toUpperCase();
    const normalizedCategory = category ? String(category).toUpperCase() : null;

    if (normalizedPlanType === 'SUBSCRIPTION') {
      if (!planCycle || !['MONTHLY', 'SIX_MONTH', 'YEARLY'].includes(String(planCycle).toUpperCase())) {
        const error = new Error('Subscription planCycle must be MONTHLY, SIX_MONTH, or YEARLY');
        error.statusCode = 400;
        throw error;
      }
    }

    const normalizedCycle = normalizedPlanType === 'SUBSCRIPTION' ? String(planCycle).toUpperCase() : null;
    const derivedDurationMonths = normalizedPlanType === 'SUBSCRIPTION'
      ? Number(durationMonths || {
          MONTHLY: 1,
          SIX_MONTH: 6,
          YEARLY: 12
        }[normalizedCycle])
      : null;

    if (!priceInPaise || Number(priceInPaise) <= 0) {
      const error = new Error('priceInPaise must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    const document = await Pricing.findOneAndUpdate(
      {
        planType: normalizedPlanType,
        planCycle: normalizedCycle,
        category: normalizedCategory,
      },
      {
        $set: {
          planType: normalizedPlanType,
          planCycle: normalizedCycle,
          category: normalizedCategory,
          durationMonths: derivedDurationMonths,
          priceInPaise: Number(priceInPaise),
          currency: currency || 'INR',
          isActive: typeof isActive === 'boolean' ? isActive : true,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    res.status(201).json({
      success: true,
      data: {
        pricing: document,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updatePricingPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { planType, planCycle, category, priceInPaise, currency, isActive } = req.body || {};

    const existingPlan = await Pricing.findById(id);
    if (!existingPlan) {
      const error = new Error('Pricing plan not found');
      error.statusCode = 404;
      throw error;
    }

    const nextPlanType = String(planType || existingPlan.planType).toUpperCase();
    const nextCategory = category ? String(category).toUpperCase() : existingPlan.category;
    const nextCycle = planType === 'SUBSCRIPTION' || existingPlan.planType === 'SUBSCRIPTION'
      ? String(planCycle || existingPlan.planCycle || 'MONTHLY').toUpperCase()
      : null;

    if (!['ONE_TIME', 'SUBSCRIPTION'].includes(nextPlanType)) {
      const error = new Error('Valid planType is required: ONE_TIME or SUBSCRIPTION');
      error.statusCode = 400;
      throw error;
    }

    if (nextPlanType === 'SUBSCRIPTION' && (!nextCycle || !['MONTHLY', 'SIX_MONTH', 'YEARLY'].includes(nextCycle))) {
      const error = new Error('Subscription planCycle must be MONTHLY, SIX_MONTH, or YEARLY');
      error.statusCode = 400;
      throw error;
    }

    if (!priceInPaise || Number(priceInPaise) <= 0) {
      const error = new Error('priceInPaise must be greater than zero');
      error.statusCode = 400;
      throw error;
    }

    const updatedPlan = await Pricing.findByIdAndUpdate(
      id,
      {
        $set: {
          planType: nextPlanType,
          planCycle: nextPlanType === 'SUBSCRIPTION' ? nextCycle : null,
          category: nextPlanType === 'ONE_TIME' ? nextCategory : null,
          priceInPaise: Number(priceInPaise),
          currency: currency || existingPlan.currency || 'INR',
          isActive: typeof isActive === 'boolean' ? isActive : existingPlan.isActive,
          durationMonths: nextPlanType === 'SUBSCRIPTION' ? (nextCycle === 'MONTHLY' ? 1 : nextCycle === 'SIX_MONTH' ? 6 : 12) : null,
        },
      },
      { new: true }
    );

    res.json({
      success: true,
      data: { pricing: updatedPlan },
    });
  } catch (error) {
    next(error);
  }
};

exports.deletePricingPlan = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deletedPlan = await Pricing.findByIdAndDelete(id);

    if (!deletedPlan) {
      const error = new Error('Pricing plan not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({
      success: true,
      data: { deletedId: id },
    });
  } catch (error) {
    next(error);
  }
};

exports.getDailyContents = async (req, res, next) => {
  try {
    const documents = await DailyContent.find({}).sort({ publishedAt: -1 }).lean();
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.downloadDailyContentFile = async (req, res, next) => {
  try {
    const { contentId, fileId } = req.params;
    const content = await DailyContent.findById(contentId).lean();

    if (!content) {
      const error = new Error('Daily content not found');
      error.statusCode = 404;
      throw error;
    }

    const file = Array.isArray(content.files)
      ? content.files.find((item) => String(item._id) === String(fileId))
      : null;

    if (!file) {
      const error = new Error('Attached file not found');
      error.statusCode = 404;
      throw error;
    }

    if (file.cloudinaryUrl) {
      return res.redirect(file.cloudinaryUrl);
    }

    const storageFilePath = path.resolve(storageDir, file.fileKey || '');
    const relativePath = path.relative(storageDir, storageFilePath);
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(storageFilePath)) {
      const error = new Error('Attached file is unavailable');
      error.statusCode = 404;
      throw error;
    }

    return res.sendFile(storageFilePath, {
      headers: {
        'Content-Disposition': `attachment; filename="${encodeURIComponent(path.basename(file.originalFileName || 'attachment'))}"`,
        'Content-Type': file.fileMimeType || 'application/octet-stream'
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.createDailyContentRecord = async (req, res, next) => {
  try {
    const { title, notes, link, targetTier, category, accessType } = req.body || {};

    if (!title) {
      const error = new Error('Title is required');
      error.statusCode = 400;
      throw error;
    }

    const normalizedCategory = String(category || 'GENERAL').toUpperCase().trim();
    const categoryRecord = await Category.findOne({
      category: normalizedCategory,
      categoryType: accessType === 'one_time_category' || targetTier === 'ONE_TIME'
        ? 'ONE_TIME_CATEGORY'
        : 'SUBSCRIPTION_DAILY',
      isActive: true
    }).lean();

    if (!categoryRecord) {
      const error = new Error('Category must match an active category catalog entry');
      error.statusCode = 400;
      throw error;
    }

    let normalizedAccessType = accessType ? String(accessType).toLowerCase().trim() : null;
    let normalizedTargetTier = targetTier ? String(targetTier).toUpperCase().trim() : null;

    if (normalizedAccessType) {
      if (normalizedAccessType === 'subscription_only') normalizedTargetTier = 'SUBSCRIPTION';
      else if (normalizedAccessType === 'one_time_category') normalizedTargetTier = 'ONE_TIME';
      else normalizedTargetTier = 'ALL';
    } else if (normalizedTargetTier) {
      if (normalizedTargetTier === 'SUBSCRIPTION') normalizedAccessType = 'subscription_only';
      else if (normalizedTargetTier === 'ONE_TIME') normalizedAccessType = 'one_time_category';
      else normalizedAccessType = 'both';
    } else {
      normalizedAccessType = 'both';
      normalizedTargetTier = 'ALL';
    }

    const document = await DailyContent.create({
      title: String(title).trim(),
      notes: notes ? String(notes).trim() : '',
      link: link ? String(link).trim() : '',
      category: normalizedCategory,
      accessType: normalizedAccessType,
      targetTier: normalizedTargetTier,
      files: [
        {
          label: 'Primary File',
          fileKey: 'manual-entry',
          originalFileName: 'manual-entry.txt',
          fileMimeType: 'text/plain',
          fileSizeBytes: 0,
        },
        {
          label: 'Secondary File',
          fileKey: 'manual-entry-2',
          originalFileName: 'manual-entry-2.txt',
          fileMimeType: 'text/plain',
          fileSizeBytes: 0,
        },
      ],
      uploadedBy: req.user.id,
    });

    res.status(201).json({ success: true, data: { content: document } });
  } catch (error) {
    next(error);
  }
};

exports.updateDailyContentRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, notes, link, targetTier, category, accessType } = req.body || {};

    const existing = await DailyContent.findById(id);
    if (!existing) {
      const error = new Error('Daily content not found');
      error.statusCode = 404;
      throw error;
    }

    const updateFields = {};
    if (title) updateFields.title = String(title).trim();
    if (notes !== undefined) updateFields.notes = String(notes).trim();
    if (link !== undefined) updateFields.link = String(link).trim();
    if (category) {
      const normalizedCategory = String(category).toUpperCase().trim();
      const categoryRecord = await Category.findOne({
        category: normalizedCategory,
        categoryType: accessType === 'one_time_category' || targetTier === 'ONE_TIME'
          ? 'ONE_TIME_CATEGORY'
          : 'SUBSCRIPTION_DAILY',
        isActive: true
      }).lean();

      if (!categoryRecord) {
        const error = new Error('Category must match an active category catalog entry');
        error.statusCode = 400;
        throw error;
      }

      updateFields.category = normalizedCategory;
    }
    if (accessType) {
      updateFields.accessType = String(accessType).toLowerCase().trim();
      if (updateFields.accessType === 'subscription_only') updateFields.targetTier = 'SUBSCRIPTION';
      else if (updateFields.accessType === 'one_time_category') updateFields.targetTier = 'ONE_TIME';
      else updateFields.targetTier = 'ALL';
    } else if (targetTier) {
      updateFields.targetTier = String(targetTier).toUpperCase().trim();
      if (updateFields.targetTier === 'SUBSCRIPTION') updateFields.accessType = 'subscription_only';
      else if (updateFields.targetTier === 'ONE_TIME') updateFields.accessType = 'one_time_category';
      else updateFields.accessType = 'both';
    }

    const document = await DailyContent.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true }
    );

    res.json({ success: true, data: { content: document } });
  } catch (error) {
    next(error);
  }
};

exports.deleteDailyContentRecord = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await DailyContent.findByIdAndDelete(id);

    if (!document) {
      const error = new Error('Daily content not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { deletedId: id } });
  } catch (error) {
    next(error);
  }
};

exports.getSubscriptions = async (req, res, next) => {
  try {
    const documents = await Subscription.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.createSubscription = async (req, res, next) => {
  try {
    const { userId, planCycle, durationMonths, status, startsAt, expiresAt, paymentId } = req.body || {};

    if (!userId || !planCycle || !durationMonths || !paymentId) {
      const error = new Error('userId, planCycle, durationMonths, and paymentId are required');
      error.statusCode = 400;
      throw error;
    }

    const document = await Subscription.create({
      userId,
      planCycle: String(planCycle).toUpperCase(),
      durationMonths: Number(durationMonths),
      status: status || 'ACTIVE',
      startsAt: startsAt ? new Date(startsAt) : new Date(),
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      paymentId,
    });

    res.status(201).json({ success: true, data: { subscription: document } });
  } catch (error) {
    next(error);
  }
};

exports.updateSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Subscription.findByIdAndUpdate(id, { $set: req.body }, { new: true });

    if (!document) {
      const error = new Error('Subscription record not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { subscription: document } });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Subscription.findByIdAndDelete(id);

    if (!document) {
      const error = new Error('Subscription record not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { deletedId: id } });
  } catch (error) {
    next(error);
  }
};

exports.getOneTimeAccess = async (req, res, next) => {
  try {
    const documents = await OneTime.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: documents });
  } catch (error) {
    next(error);
  }
};

exports.createOneTimeAccess = async (req, res, next) => {
  try {
    const { userId, category, isLifetimeActive, paymentId } = req.body || {};

    if (!userId || !category || !paymentId) {
      const error = new Error('userId, category, and paymentId are required');
      error.statusCode = 400;
      throw error;
    }

    const document = await OneTime.create({
      userId,
      category: String(category).toUpperCase(),
      isLifetimeActive: typeof isLifetimeActive === 'boolean' ? isLifetimeActive : true,
      paymentId,
    });

    res.status(201).json({ success: true, data: { access: document } });
  } catch (error) {
    next(error);
  }
};

exports.updateOneTimeAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await OneTime.findByIdAndUpdate(id, { $set: req.body }, { new: true });

    if (!document) {
      const error = new Error('One-time access record not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { access: document } });
  } catch (error) {
    next(error);
  }
};

exports.deleteOneTimeAccess = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await OneTime.findByIdAndDelete(id);

    if (!document) {
      const error = new Error('One-time access record not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { deletedId: id } });
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, hasActiveSubscription, hasOneTimeAccess } = req.body || {};

    if (!name || !email || !password) {
      const error = new Error('name, email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const existing = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) {
      const error = new Error('User with this email already exists');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);
    const document = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword,
      role: role === 'ADMIN' ? 'ADMIN' : 'USER',
      hasActiveSubscription: Boolean(hasActiveSubscription),
      hasOneTimeAccess: Boolean(hasOneTimeAccess),
    });

    const safeUser = document.toObject();
    delete safeUser.password;

    res.status(201).json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, hasActiveSubscription, hasOneTimeAccess } = req.body || {};

    const document = await User.findById(id);
    if (!document) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    if (name) document.name = String(name).trim();
    if (email) document.email = String(email).trim().toLowerCase();
    if (role) document.role = role === 'ADMIN' ? 'ADMIN' : 'USER';
    if (typeof hasActiveSubscription === 'boolean') document.hasActiveSubscription = hasActiveSubscription;
    if (typeof hasOneTimeAccess === 'boolean') document.hasOneTimeAccess = hasOneTimeAccess;

    await document.save();

    const safeUser = document.toObject();
    delete safeUser.password;

    res.json({ success: true, data: safeUser });
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await User.findByIdAndDelete(id);

    if (!document) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { deletedId: id } });
  } catch (error) {
    next(error);
  }
};

exports.getPayments = async (req, res, next) => {
  try {
    const list = await Payment.find({}).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: list });
  } catch (error) {
    next(error);
  }
};

exports.createPayment = async (req, res, next) => {
  try {
    const { userId, paymentType, planCycle, category, razorpayOrderId, razorpayPaymentId, amountInPaise, currency, status } = req.body || {};

    if (!userId || !paymentType || !razorpayOrderId || !razorpayPaymentId || !amountInPaise) {
      const error = new Error('userId, paymentType, razorpayOrderId, razorpayPaymentId, and amountInPaise are required');
      error.statusCode = 400;
      throw error;
    }

    const document = await Payment.create({
      userId,
      paymentType: String(paymentType).toUpperCase(),
      planCycle: planCycle ? String(planCycle).toUpperCase() : null,
      category: category ? String(category).toUpperCase() : null,
      razorpayOrderId: String(razorpayOrderId),
      razorpayPaymentId: String(razorpayPaymentId),
      razorpaySignature: req.body.razorpaySignature || null,
      amountInPaise: Number(amountInPaise),
      currency: currency || 'INR',
      status: status || 'SUCCESS',
    });

    res.status(201).json({ success: true, data: { payment: document } });
  } catch (error) {
    next(error);
  }
};

exports.updatePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Payment.findByIdAndUpdate(id, { $set: req.body }, { new: true });

    if (!document) {
      const error = new Error('Payment record not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { payment: document } });
  } catch (error) {
    next(error);
  }
};

exports.deletePayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const document = await Payment.findByIdAndDelete(id);

    if (!document) {
      const error = new Error('Payment record not found');
      error.statusCode = 404;
      throw error;
    }

    res.json({ success: true, data: { deletedId: id } });
  } catch (error) {
    next(error);
  }
};
