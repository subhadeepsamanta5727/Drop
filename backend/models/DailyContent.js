const mongoose = require('mongoose');

const fileItemSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      default: 'Attachment'
    },
    fileKey: {
      type: String,
      required: true // Path or key inside private_storage
    },
    cloudinaryPublicId: {
      type: String,
      default: null
    },
    cloudinaryUrl: {
      type: String,
      default: null
    },
    originalFileName: {
      type: String,
      required: true
    },
    fileMimeType: {
      type: String,
      default: 'application/octet-stream'
    },
    fileSizeBytes: {
      type: Number,
      default: 0
    }
  },
  { _id: true }
);

const dailyContentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },
    notes: {
      type: String,
      default: '',
      trim: true
    },
    link: {
      type: String,
      default: '',
      trim: true
    },
    contentType: {
      type: String,
      enum: ['SUBSCRIPTION_DAILY', 'ONE_TIME_CATEGORY'],
      default: null,
      index: true
    },
    targetTier: {
      type: String,
      enum: ['ONE_TIME', 'SUBSCRIPTION', 'ALL'],
      required: true,
      default: 'ALL',
      index: true
    },
    category: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      default: 'GENERAL',
      index: true
    },
    accessType: {
      type: String,
      enum: ['subscription_only', 'one_time_category', 'both'],
      default: 'both',
      index: true
    },
    // One or more uploaded files belonging to this daily-content entry.
    files: {
      type: [fileItemSchema],
      validate: [
        function (val) {
          return Array.isArray(val) && val.length >= 1;
        },
        'At least 1 file must be uploaded.'
      ]
    },
    publishedAt: {
      type: Date,
      default: Date.now,
      index: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Synchronize targetTier and accessType
dailyContentSchema.pre('save', function (next) {
  if (this.contentType === 'SUBSCRIPTION_DAILY') {
    this.accessType = 'subscription_only';
    this.targetTier = 'SUBSCRIPTION';
  } else if (this.contentType === 'ONE_TIME_CATEGORY') {
    this.accessType = 'one_time_category';
    this.targetTier = 'ONE_TIME';
  }

  if (this.accessType) {
    if (this.accessType === 'subscription_only') this.targetTier = 'SUBSCRIPTION';
    else if (this.accessType === 'one_time_category') this.targetTier = 'ONE_TIME';
    else if (this.accessType === 'both') this.targetTier = 'ALL';
  } else if (this.targetTier) {
    if (this.targetTier === 'SUBSCRIPTION') this.accessType = 'subscription_only';
    else if (this.targetTier === 'ONE_TIME') this.accessType = 'one_time_category';
    else if (this.targetTier === 'ALL') this.accessType = 'both';
  }
  next();
});

// Compound queries for dashboard filtering
dailyContentSchema.index({ targetTier: 1, publishedAt: -1 });
dailyContentSchema.index({ category: 1, publishedAt: -1 });
dailyContentSchema.index({ accessType: 1, publishedAt: -1 });
dailyContentSchema.index({ contentType: 1, category: 1, publishedAt: -1 });

module.exports = mongoose.model('DailyContent', dailyContentSchema);
