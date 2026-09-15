const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    paymentType: {
      type: String,
      enum: ['ONE_TIME', 'SUBSCRIPTION'],
      required: true
    },
    planCycle: {
      type: String,
      enum: ['MONTHLY', 'SIX_MONTH', 'YEARLY', null],
      default: null
    },
    category: {
      type: String,
      default: null
    },
    razorpayOrderId: {
      type: String,
      required: true,
      index: true
    },
    razorpayPaymentId: {
      type: String,
      required: true,
      unique: true
    },
    razorpaySignature: {
      type: String,
      default: null
    },
    amountInPaise: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILED', 'REFUNDED'],
      default: 'SUCCESS'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);