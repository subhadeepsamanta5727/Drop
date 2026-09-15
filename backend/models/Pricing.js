const mongoose = require('mongoose');

const pricingSchema = new mongoose.Schema(
  {
    planType: {
      type: String,
      enum: ['ONE_TIME', 'SUBSCRIPTION'],
      required: true,
      index: true
    },
    // For Subscriptions: 'MONTHLY', 'SIX_MONTH', 'YEARLY'
    planCycle: {
      type: String,
      enum: ['MONTHLY', 'SIX_MONTH', 'YEARLY', null],
      default: null
    },
    // For One-Time: 'CRYPTO', 'STOCKS', 'FOREX', 'GENERAL', etc.
    category: {
      type: String,
      default: null
    },
    durationMonths: {
      type: Number,
      default: null // 1, 6, 12 for subscriptions; null for one-time
    },
    priceInPaise: {
      type: Number,
      required: true // e.g., 99900 = ₹999
    },
    currency: {
      type: String,
      default: 'INR'
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

pricingSchema.index({ planType: 1, planCycle: 1, category: 1 });

module.exports = mongoose.model('Pricing', pricingSchema);