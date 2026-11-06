const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const authMiddleware = require('../middleware/auth');

// Получить все ссылки пользователя (ТОЛЬКО активные)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Получаем все ссылки пользователя
    const links = await Link.find({ userId: req.user.id }).sort({ createdAt: -1 });
    
    // Фильтруем на уровне JavaScript: показываем только активные или без поля isActive
    const activeLinks = links.filter(link => 
      link.isActive !== false
    );
    
    res.json(activeLinks);
  } catch (error) {
    console.error('Ошибка получения ссылок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую ссылку
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { originalUrl, customCode, expiresAt } = req.body;
    
    let shortCode = customCode;
    
    // Если код не предоставлен, генерируем уникальный среди АКТИВНЫХ ссылок
    if (!shortCode) {
      let isUnique = false;
      while (!isUnique) {
        shortCode = Math.random().toString(36).substring(2, 8);
        //  Проверяем только среди АКТИВНЫХ ссылок
        const existing = await Link.findOne({ shortCode, isActive: true });
        if (!existing) {
          isUnique = true;
        }
      }
    }
    
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
    // Ошибка дублирования ключа (если кастомный код уже занят АКТИВНОЙ ссылкой)
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Этот код уже занят активной ссылкой' });
    }
    console.error('❌ Ошибка создания ссылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить ссылку (soft delete)
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Link.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { isActive: false }
    );
    
    // Проверяем, был ли документ реально обновлен
    if (result.modifiedCount === 0 && result.nModified === 0) {
      return res.status(404).json({ error: 'Ссылка не найдена или уже удалена' });
    }
    
    res.json({ message: 'Ссылка удалена' });
  } catch (error) {
    console.error('❌ Ошибка удаления ссылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;