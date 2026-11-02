const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  date: { type: Date, default: Date.now },
  ip: String,
  region: String,
  country: String,
  city: String,
  browser: String,
  os: String,
  device: String,
  userAgent: String
});

const linkSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clicks: [clickSchema],
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  customCode: { type: Boolean, default: false }
});

// Индекс для автоудаления просроченных ссылок
linkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Link', linkSchema);