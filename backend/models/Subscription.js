const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    planCycle: {
      type: String,
      enum: ['MONTHLY', 'SIX_MONTH', 'YEARLY'],
      required: true
    },
    durationMonths: {
      type: Number,
      required: true // 1, 6, or 12
    },
    // FIFO Queue States
    status: {
      type: String,
      enum: ['ACTIVE', 'QUEUED', 'COMPLETED'],
      default: 'QUEUED',
      index: true
    },
    startsAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null,
      index: true
    },
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
      required: true
    }
  },
  { timestamps: true }
);

// Compound indexes for fast active plan lookups and FIFO queuing
subscriptionSchema.index({ userId: 1, status: 1, createdAt: 1 });
subscriptionSchema.index({ userId: 1, startsAt: 1, expiresAt: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);