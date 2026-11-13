const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Link = require('../models/Link');
const Click = require('../models/Click');
const authMiddleware = require('../middleware/auth');

// GET /api/links — список ссылок пользователя с безопасным поиском
// Получить все ссылки пользователя с поддержкой безопасного поиска
router.get('/', authMiddleware, async (req, res) => {
try {
const { search } = req.query; // 1. Параметр поиска из URL

// 2. Базовый фильтр: только ссылки этого пользователя (без операторов!)
const query = { userId: req.user.id };

// 3. Если есть поиск — добавляем его безопасно
if (search && search.trim() !== '') {
// Экранируем спецсимволы регулярных выражений (требование ментора)
const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Создаём объект RegExp — sanitizeFilter его НЕ трогает, всё безопасно
const regex = new RegExp(escapedSearch, 'i');
query.$or = [
{ originalUrl: regex },
{ shortCode: regex }
];
}

const links = await Link.find(query)
.sort({ createdAt: -1 })
.lean();

// 4. Возвращаем фильтрацию isActive на JavaScript (как было раньше)
const activeLinks = links.filter(link => link.isActive !== false);
res.json(activeLinks);
} catch (error) {
console.error('Ошибка получения ссылок:', error);
res.status(500).json({ error: 'Ошибка сервера' });
}
});

// GET /api/links/:idOrCode/clicks — история кликов с пагинацией (только для владельца)

router.get('/:idOrCode/clicks', authMiddleware, async (req, res) => {
  try {
    const { idOrCode } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // 1. Сначала пробуем найти по _id (если это валидный ObjectId)
    let link = null;
    if (mongoose.isValidObjectId(idOrCode)) {
      link = await Link.findOne({ _id: idOrCode, userId: req.user.id });
    }
    // 2. Если по _id не нашли — ищем по shortCode
    if (!link) {
      link = await Link.findOne({ shortCode: idOrCode, userId: req.user.id });
    }

    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    // 3. Общее количество кликов для пагинации
    const totalClicks = await Click.countDocuments({ linkId: link._id });

    // 4. Сами клики: новые сверху, с пагинацией
    const clicks = await Click.find({ linkId: link._id })
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit))
      .select('-_id');

    res.json({
      shortCode: link.shortCode,
      totalClicks,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalClicks / Number(limit)),
      clicks
    });
  } catch (error) {
    console.error('Ошибка получения истории кликов:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});


router.post('/', authMiddleware, async (req, res) => {
  try {
    // 1. Получаем expiresIn (дни) вместо expiresAt
    const { originalUrl, customCode, expiresIn } = req.body;

    // 2. ВАЛИДАЦИЯ: разрешаем только 0, 7, 30 или 90 дней
    const allowedDurations = [0, 7, 30, 90];
    const parsedExpiresIn = parseInt(expiresIn, 10);

    if (!allowedDurations.includes(parsedExpiresIn)) {
      return res.status(400).json({ error: 'Недопустимый срок действия. Разрешено: 0, 7, 30 или 90 дней.' });
    }

    // 3. ВЫЧИСЛЯЕМ дату истечения НА СЕРВЕРЕ
    let calculatedExpiresAt = null;
    if (parsedExpiresIn > 0) {
      calculatedExpiresAt = new Date(Date.now() + parsedExpiresIn * 24 * 60 * 60 * 1000);
    }

    let shortCode;

    // ПРОВЕРКА КАСТОМНОГО КОДА НА СЕРВЕРЕ 
    if (customCode) {
      // Наш волшебный трафарет (регулярное выражение) от ментора
      const codeRegex = /^[a-z0-9-]{3,32}$/;
      
      // Проверяем: если код НЕ проходит проверку трафаретом...
      if (!codeRegex.test(customCode)) {
        // ...мы сразу останавливаемся и отвечаем ошибкой 400
        return res.status(400).json({ 
          error: 'Кастомный код может содержать только строчные латинские буквы, цифры и дефис, длина от 3 до 32 символов.' 
        });
      }
      // Если проверка пройдена, только тогда мы его принимаем
      shortCode = customCode;
    }

    // Если код не предоставлен (или не прошел проверку, хотя мы бы уже ушли выше), генерируем уникальный
    if (!shortCode) {
      let isUnique = false;
      while (!isUnique) {
        shortCode = Math.random().toString(36).substring(2, 8);
        const existing = await Link.findOne({ shortCode });
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
      expiresAt: calculatedExpiresAt
    });

    await link.save();
    res.status(201).json(link);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Этот короткий код уже занят. Пожалуйста, выберите другой.' });
    }
    console.error('❌ Ошибка создания ссылки:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// DELETE /api/links/:id — удалить ссылку (soft delete)

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await Link.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { isActive: false }
    );
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