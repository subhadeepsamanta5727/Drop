const fs = require('fs');
const path = require('path');
const DailyContent = require('../models/DailyContent');
const Pricing = require('../models/Pricing');
const User = require('../models/User');
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

    const { title, notes, targetTier } = req.body || {};

    if (!title || !targetTier) {
      const error = new Error('Title and targetTier are required');
      error.statusCode = 400;
      throw error;
    }

    const normalizedTargetTier = String(targetTier).toUpperCase();
    const allowedTargets = ['ONE_TIME', 'SUBSCRIPTION', 'ALL'];
    if (!allowedTargets.includes(normalizedTargetTier)) {
      const error = new Error('targetTier must be ONE_TIME, SUBSCRIPTION, or ALL');
      error.statusCode = 400;
      throw error;
    }

    const uploadedFileAssets = await Promise.all(
      files.map(async (file) => {
        const cloudAsset = await buildCloudinaryAsset(file);
        if (!cloudAsset) {
          const error = new Error('Cloudinary is not configured for file uploads');
          error.statusCode = 503;
          throw error;
        }

        return {
          label: file.originalname || 'Attachment',
          fileKey: cloudAsset.publicId || cloudAsset.url || file.originalname,
          cloudinaryPublicId: cloudAsset.publicId || null,
          cloudinaryUrl: cloudAsset.url || null,
          originalFileName: file.originalname,
          fileMimeType: file.mimetype || 'application/octet-stream',
          fileSizeBytes: file.size || 0,
        };
      })
    );

    const uploadedContent = await DailyContent.create({
      title: String(title).trim(),
      notes: notes ? String(notes).trim() : '',
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
    const { title, notes, targetTier } = req.body || {};

    if (!title || !targetTier) {
      const error = new Error('Title and targetTier are required');
      error.statusCode = 400;
      throw error;
    }

    const document = await DailyContent.create({
      title: String(title).trim(),
      notes: notes ? String(notes).trim() : '',
      targetTier: String(targetTier).toUpperCase(),
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
    const { title, notes, targetTier } = req.body || {};

    const existing = await DailyContent.findById(id);
    if (!existing) {
      const error = new Error('Daily content not found');
      error.statusCode = 404;
      throw error;
    }

    const document = await DailyContent.findByIdAndUpdate(
      id,
      {
        $set: {
          title: title ? String(title).trim() : existing.title,
          notes: notes !== undefined ? String(notes).trim() : existing.notes,
          targetTier: targetTier ? String(targetTier).toUpperCase() : existing.targetTier,
        },
      },
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

    const document = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: String(password),
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
