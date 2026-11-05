const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: true,
    index: true
  },
  ip: String,
  browser: String,
  os: String,
  device: String,
  country: {
    type: String,
    default: 'Unknown'
  },
  city: {
    type: String,
    default: 'Unknown'
  },
  region: {
    type: String,
    default: 'Unknown'
  },
  userAgent: {
    type: String,
    maxlength: 500
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
});

clickSchema.index({ linkId: 1, date: 1 });

module.exports = mongoose.model('Click', clickSchema);