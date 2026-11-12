const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const Click = require('../models/Click'); //  Добавили для пагинации кликов
const authMiddleware = require('../middleware/auth');

// Получить все ссылки пользователя (ТОЛЬКО активные)
router.get('/', authMiddleware, async (req, res) => {
  try {
    //  .lean() возвращает обычные JS-объекты, а не Mongoose-документы
    const links = await Link.find({ userId: req.user.id })
      .select('-clicks')  //  Явно исключаем clicks на уровне MongoDB
      .sort({ createdAt: -1 })
      .lean();  // преобразуем в обычные объекты
    
    // Фильтруем на уровне JavaScript: показываем только активные
    const activeLinks = links.filter(link => link.isActive !== false);
    
    res.json(activeLinks);
  } catch (error) {
    console.error('Ошибка получения ссылок:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

//  НОВЫЙ РОУТ: Получить историю кликов постранично (только для владельца)
router.get('/:id/clicks', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // 1. Проверяем, что ссылка существует и принадлежит пользователю
    const link = await Link.findOne({ _id: req.params.id, userId: req.user.id });
    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    // 2. Получаем общее количество кликов для расчёта пагинации
    const totalClicks = await Click.countDocuments({ linkId: link._id });

    // 3. Получаем клики с пагинацией и сортировкой по дате (новые сверху)
    const clicks = await Click.find({ linkId: link._id })
      .sort({ date: -1 }) // Используем составной индекс { linkId: 1, date: -1 }
      .skip(skip)
      .limit(Number(limit))
      .select('-_id'); // Убираем _id самого клика для чистоты ответа

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

// Создать новую ссылку
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
      // Текущее время + (количество дней * 24 часа * 60 минут * 60 секунд * 1000 мс)
      calculatedExpiresAt = new Date(Date.now() + parsedExpiresIn * 24 * 60 * 60 * 1000);
    }
    
    let shortCode = customCode;
    
    // Если код не предоставлен, генерируем уникальный
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
      expiresAt: calculatedExpiresAt // 4. Используем вычисленную сервером дату
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

module.exports = router;