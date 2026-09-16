const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const OneTime = require('../models/OneTime');
const env = require('../config/env');

const signToken = (user) => jwt.sign(
  { id: user._id.toString(), role: user.role },
  env.jwtSecret,
  { expiresIn: env.jwtExpiresIn }
);

const buildProfileSummary = async (userId) => {
  const [activeCount, queuedCount, completedCount, lifetimeCategories] = await Promise.all([
    Subscription.countDocuments({ userId: userId, status: 'ACTIVE' }),
    Subscription.countDocuments({ userId: userId, status: 'QUEUED' }),
    Subscription.countDocuments({ userId: userId, status: 'COMPLETED' }),
    OneTime.find({ userId: userId, isLifetimeActive: true }).distinct('category')
  ]);

  return {
    activeCount,
    queuedCount,
    completedCount,
    lifetimeCategories
  };
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      const error = new Error('Name, email, and password are required');
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (existingUser) {
      const error = new Error('User already exists');
      error.statusCode = 409;
      throw error;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await User.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      password: hashedPassword
    });

    const token = signToken(user);
    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hasActiveSubscription: user.hasActiveSubscription,
          hasOneTimeAccess: user.hasOneTimeAccess,
          subscription: user.subscription || {
            plan: null,
            status: 'inactive',
            expiresAt: null
          },
          purchasedCategories: user.purchasedCategories || []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      const error = new Error('Email and password are required');
      error.statusCode = 400;
      throw error;
    }

    const user = await User.findOne({ email: String(email).trim().toLowerCase() });
    if (!user) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password');
      error.statusCode = 401;
      throw error;
    }

    const token = signToken(user);
    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          hasActiveSubscription: user.hasActiveSubscription,
          hasOneTimeAccess: user.hasOneTimeAccess,
          subscription: user.subscription || {
            plan: null,
            status: user.hasActiveSubscription ? 'active' : 'inactive',
            expiresAt: null
          },
          purchasedCategories: user.purchasedCategories || []
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      throw error;
    }

    const summary = await buildProfileSummary(user._id);
    const combinedCategories = Array.from(new Set([
      ...(summary.lifetimeCategories || []),
      ...(user.purchasedCategories || []).map((item) => String(item.category).toUpperCase())
    ]));

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        hasActiveSubscription: user.hasActiveSubscription,
        hasOneTimeAccess: user.hasOneTimeAccess || Boolean(combinedCategories.length),
        subscription: user.subscription || {
          plan: null,
          status: user.hasActiveSubscription ? 'active' : 'inactive',
          expiresAt: null
        },
        purchasedCategories: user.purchasedCategories || [],
        subscriptionQueue: {
          active: summary.activeCount,
          queued: summary.queuedCount,
          completed: summary.completedCount
        },
        lifetimeCategories: combinedCategories
      }
    });
  } catch (error) {
    next(error);
  }
};
