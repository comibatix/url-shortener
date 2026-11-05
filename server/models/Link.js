const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
  originalUrl: { type: String, required: true },
  shortCode: { type: String, required: true, unique: true },
  totalClicks: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  clicks: [], // Оставляем пустым для обратной совместимости, но не используем
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: null },
  customCode: { type: Boolean, default: false }
});

// TTL-индекс ЗАКОММЕНТИРОВАН — чтобы статистика не удалялась вместе со ссылкой
// linkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Link', linkSchema);