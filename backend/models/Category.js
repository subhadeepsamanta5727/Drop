const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true
    },
    categoryType: {
      type: String,
      enum: ['SUBSCRIPTION_DAILY', 'ONE_TIME_CATEGORY'],
      required: true,
      index: true
    },
    note: {
      type: String,
      default: '',
      trim: true
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    price: {
      type: Number,
      default: null,
      min: 0
    },
    priceInPaise: {
      type: Number,
      default: null,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

categorySchema.index({ categoryType: 1, category: 1 }, { unique: true });

categorySchema.pre('validate', function (next) {
  if (this.category && !this.slug) {
    this.slug = this.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }

  if (this.categoryType === 'SUBSCRIPTION_DAILY') {
    this.price = null;
    this.priceInPaise = null;
  } else if (this.price !== null && this.price !== undefined) {
    this.priceInPaise = Math.round(Number(this.price) * 100);
  }

  next();
});

module.exports = mongoose.model('Category', categorySchema);
