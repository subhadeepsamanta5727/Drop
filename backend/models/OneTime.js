const mongoose = require('mongoose');

const oneTimeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    category: {
      type: String,
      required: true,
      index: true
    },
    isLifetimeActive: {
      type: Boolean,
      default: true,
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

// Prevent purchasing the exact same category twice for the same user
oneTimeSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('OneTime', oneTimeSchema);