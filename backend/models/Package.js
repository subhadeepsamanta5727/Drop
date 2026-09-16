const mongoose = require('mongoose');

const packageSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true
    },
    price: {
      type: Number,
      required: true
    },
    priceInPaise: {
      type: Number
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    thumbnail: {
      type: String,
      default: '',
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  { timestamps: true }
);

packageSchema.pre('save', function (next) {
  if (this.category && !this.slug) {
    this.slug = this.category.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  if (this.price !== undefined) {
    this.priceInPaise = Math.round(this.price * 100);
  }
  next();
});

module.exports = mongoose.model('Package', packageSchema);
