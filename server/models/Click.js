const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  linkId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Link',
    required: true,
    index: true
  },
  ip: {
    type: String,
    required: true
  },
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
    maxlength: 200  //  Согласовано с обрезкой в public.js
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  }
});

//  Составной индекс: сначала по ссылке, потом по дате (новые сверху)
clickSchema.index({ linkId: 1, date: -1 });

module.exports = mongoose.model('Click', clickSchema);