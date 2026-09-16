const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      index: true
    },
    password: {
      type: String,
      required: true
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER'
    },
    // Fast lookup flags for conditional UI rendering
    hasActiveSubscription: {
      type: Boolean,
      default: false,
      index: true
    },
    hasOneTimeAccess: {
      type: Boolean,
      default: false,
      index: true
    },
    subscription: {
      plan: {
        type: String,
        default: null
      },
      status: {
        type: String,
        default: 'inactive'
      },
      expiresAt: {
        type: Date,
        default: null
      }
    },
    purchasedCategories: [
      {
        category: {
          type: String,
          required: true,
          trim: true,
          uppercase: true
        },
        orderId: {
          type: String,
          default: null
        },
        purchasedAt: {
          type: Date,
          default: Date.now
        }
      }
    ]
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);