const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const authMiddleware = require('../middleware/auth');

// Получить все ссылки пользователя (для дашборда)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(links);
  } catch (error) {
    console.error('Ошибка получения ссылок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую ссылку
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { originalUrl, customCode, expiresAt } = req.body;
    
    const shortCode = customCode || Math.random().toString(36).substring(2, 8);
    
    const link = new Link({
      userId: req.user.id,
      originalUrl,
      shortCode,
      customCode: !!customCode,
      expiresAt: expiresAt ? new Date(expiresAt) : null
    });
    
    await link.save();
    res.status(201).json(link);
  } catch (error) {
    console.error('❌ Ошибка создания ссылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить ссылку (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Link.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { isActive: false }
    );
    res.json({ message: 'Ссылка удалена' });
  } catch (error) {
    console.error('Ошибка удаления ссылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;