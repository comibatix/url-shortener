const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true }, // ⚠️ Убрали unique: true отсюда
  totalClicks: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  customCode: { type: Boolean, default: false }
});

// Строгий уникальный индекс: код нельзя использовать повторно
linkSchema.index({ shortCode: 1 }, { unique: true });
module.exports = mongoose.model('Link', linkSchema);