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
    targetTier: {
      type: String,
      enum: ['ONE_TIME', 'SUBSCRIPTION', 'ALL'],
      required: true,
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

// Compound queries for dashboard filtering
dailyContentSchema.index({ targetTier: 1, publishedAt: -1 });

module.exports = mongoose.model('DailyContent', dailyContentSchema);
