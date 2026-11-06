const express = require('express');
const router = express.Router();
const crypto = require('crypto'); //  Для хэширования IP
const Link = require('../models/Link');
const Click = require('../models/Click');
const UAParser = require('ua-parser-js');
const rateLimit = require('express-rate-limit');

//  Кэш для геоданных (IP -> данные), чтобы не превышать лимит 45 запросов/мин
const geoCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 час

//  Функция хэширования IP (SHA-256)
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

//  Rate limit для публичных роутов (защита от перебора shortCode)
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов с одного IP
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Применяем rate limit ко всем публичным роутам
router.use(publicLimiter);

// Фоновая обработка клика (не блокирует редирект)
async function processClickInBackground(linkId, ip, userAgent) {
  try {
    const parser = new UAParser(userAgent);
    const ua = parser.getResult();

    let country = 'Unknown';
    let city = 'Unknown';
    let region = 'Unknown';

    // 1. Проверяем кэш
    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      country = cached.country;
      city = cached.city;
      region = cached.region;
    } else {
      // 2. Если нет в кэше, делаем запрос (с таймаутом и HTTPS)
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 секунды таймаут
        
        //  Используем HTTPS и запрашиваем только нужные поля
        const response = await fetch(`https://ip-api.com/json/${ip}?fields=status,country,regionName,city`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            country = data.country || 'Unknown';
            city = data.city || 'Unknown';
            region = data.regionName || 'Unknown';
            
            // Сохраняем в кэш
            geoCache.set(ip, { country, city, region, timestamp: Date.now() });
          }
        }
      } catch (err) {
        console.log('Geo fetch failed or timed out, using defaults');
      }
    }

    // 3.  Хэшируем IP перед сохранением
    const hashedIP = hashIP(ip);

    // 4.  Усекаем user-agent до 200 символов (было 500)
    const truncatedUA = userAgent?.substring(0, 200) || '';

    // 5. Сохраняем клик в базу ОДИН раз
    await Click.create({
      linkId,
      ip: hashedIP, //  Теперь хэш, а не реальный IP
      browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
      os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
      device: ua.device.type || 'desktop',
      userAgent: truncatedUA, //  Усечённый user-agent
      country,
      city,
      region
    });
  } catch (error) {
    console.error('Ошибка фонового сохранения клика:', error);
  }
}

// Редирект по короткой ссылке (ПУБЛИЧНЫЙ)
router.get('/:shortCode', async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    
    if (!link || !link.isActive) {
      return res.status(410).send('Ссылка неактивна или истекла');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      await Link.updateOne({ _id: link._id }, { isActive: false });
      return res.status(410).send('Ссылка истекла');
    }

    //  req.ip теперь работает корректно благодаря trust proxy в index.js
    const ip = req.ip || '0.0.0.0';

    // 1. Сразу увеличиваем счетчик (быстро)
    Link.updateOne({ _id: link._id }, { $inc: { totalClicks: 1 } }).catch(console.error);

    // 2.  СРАЗУ делаем редирект (пользователь не ждет гео-запрос)
    res.redirect(302, link.originalUrl);

    // 3.  Обрабатываем клик и гео в фоне (не блокируя ответ)
    processClickInBackground(link._id, ip, req.headers['user-agent']);

  } catch (error) {
    console.error('Ошибка редиректа:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Публичная статистика (ПУБЛИЧНЫЙ)
router.get('/:shortCode/stats', async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    
    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    const stats = await Click.aggregate([
      { $match: { linkId: link._id } },
      {
        $group: {
          _id: null,
          totalClicks: { $sum: 1 },
          browsers: { $push: '$browser' },
          osList: { $push: '$os' },
          countries: { $push: '$country' },
          cities: { $push: '$city' }
        }
      }
    ]);

    const result = stats[0] || { totalClicks: 0 };

    const countArray = (arr) => {
      const count = {};
      arr?.forEach(item => {
        if (item) { // Защита от null/undefined
          count[item] = (count[item] || 0) + 1;
        }
      });
      return count;
    };

    res.json({
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      totalClicks: result.totalClicks,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      customCode: link.customCode,
      browsers: countArray(result.browsers),
      os: countArray(result.osList),
      countries: countArray(result.countries),
      cities: countArray(result.cities)
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;