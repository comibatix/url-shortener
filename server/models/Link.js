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

//  Частичный уникальный индекс: shortCode уникален ТОЛЬКО среди активных ссылок
// Это позволяет переиспользовать код после того, как старая ссылка стала неактивной
linkSchema.index({ shortCode: 1 }, { unique: true, partialFilterExpression: { isActive: true } });

module.exports = mongoose.model('Link', linkSchema);