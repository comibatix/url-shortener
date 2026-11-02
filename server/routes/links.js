const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const crypto = require('crypto');
const authMiddleware = require('../middleware/auth');

// POST /api/links - создание короткой ссылки
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { originalUrl, customCode, expiresIn } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ error: 'URL обязателен' });
    }

    let shortCode;
    let isCustom = false;

    if (customCode && customCode.trim() !== '') {
      shortCode = customCode.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
      
      if (!shortCode) {
        return res.status(400).json({ 
          error: 'Кастомный код должен содержать только латинские буквы (a-z), цифры (0-9) и дефис (-)' 
        });
      }
      
      const existing = await Link.findOne({ shortCode });
      if (existing) {
        return res.status(400).json({ error: 'Этот код уже занят' });
      }
      isCustom = true;
    } else {
      shortCode = crypto.randomBytes(3).toString('hex');
    }

    let expiresAt = null;
    if (expiresIn && expiresIn > 0) {
      expiresAt = new Date(Date.now() + expiresIn * 24 * 60 * 60 * 1000);
    }

    const link = new Link({
      originalUrl,
      shortCode,
      userId: req.user.userId,
      customCode: isCustom,
      expiresAt
    });

    await link.save();

    // ✅ ВАЖНО: возвращаем originalUrl в ответе!
    res.json({
      originalUrl: originalUrl,
      shortUrl: `http://localhost:5000/${shortCode}`,
      statsUrl: `http://localhost:5000/${shortCode}+`,
      shortCode,
      customCode: isCustom,
      expiresAt
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/links - получить все ссылки пользователя
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search } = req.query;
    
    let query = { userId: req.user.userId };
    
    if (search && search.trim() !== '') {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { originalUrl: searchRegex },
        { shortCode: searchRegex }
      ];
    }

    const links = await Link.find(query).sort({ createdAt: -1 });
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/links/:shortCode - получить статистику
router.get('/:shortCode', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOne({ 
      shortCode: req.params.shortCode,
      userId: req.user.userId
    });

    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    res.json({
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      totalClicks: link.clicks.length,
      clicks: link.clicks,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      customCode: link.customCode
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/links/:shortCode - удалить ссылку
router.delete('/:shortCode', authMiddleware, async (req, res) => {
  try {
    const link = await Link.findOneAndDelete({
      shortCode: req.params.shortCode,
      userId: req.user.userId
    });

    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    res.json({ message: 'Ссылка удалена' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;