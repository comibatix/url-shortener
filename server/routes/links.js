const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const Click = require('../models/Click');
const UAParser = require('ua-parser-js');

// Получить все ссылки пользователя (для дашборда)
router.get('/', async (req, res) => {
  try {
    const links = await Link.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(links);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Создать новую ссылку
router.post('/', async (req, res) => {
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
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Редирект по короткой ссылке
router.get('/:shortCode', async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    
    if (!link || !link.isActive) {
      return res.status(410).send('Ссылка неактивна или истекла');
    }

    // Проверяем срок действия
    if (link.expiresAt && link.expiresAt < new Date()) {
      await Link.updateOne({ _id: link._id }, { isActive: false });
      return res.status(410).send('Ссылка истекла');
    }

    // Получаем IP
    const ip = req.ip || req.connection.remoteAddress;

    // Парсим User-Agent
    const parser = new UAParser(req.headers['user-agent']);
    const ua = parser.getResult();

    // Создаем клик в ОТДЕЛЬНОЙ коллекции
    const click = new Click({
      linkId: link._id,
      ip: ip,
      browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
      os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
      device: ua.device.type || 'desktop',
      userAgent: req.headers['user-agent']?.substring(0, 500) || ''
    });

    // Сохраняем клик асинхронно (не блокируем редирект)
    click.save().catch(err => console.error('Ошибка сохранения клика:', err));

    // Получаем геолокацию с таймаутом (не блокируем редирект)
    const getGeoData = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(`http://ip-api.com/json/${ip}`, {
          signal: controller.signal
        });
        clearTimeout(timeout);
        
        const data = await response.json();
        if (data.status === 'success') {
          click.country = data.country || 'Unknown';
          click.city = data.city || 'Unknown';
          click.region = data.regionName || 'Unknown';
          await click.save();
        }
      } catch (error) {
        click.country = 'Unknown';
        click.city = 'Unknown';
        click.region = 'Unknown';
        await click.save().catch(() => {});
      }
    };

    getGeoData();

    // Увеличиваем счетчик в ссылке
    await Link.updateOne(
      { _id: link._id },
      { $inc: { totalClicks: 1 } }
    );

    // Редирект СРАЗУ
    res.redirect(302, link.originalUrl);
  } catch (error) {
    console.error('Ошибка редиректа:', error);
    res.status(500).send('Ошибка сервера');
  }
});

// Публичная статистика — только агрегаты, БЕЗ IP и user-agent
router.get('/:shortCode/stats', async (req, res) => {
  try {
    const link = await Link.findOne({ shortCode: req.params.shortCode });
    
    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    // Считаем агрегаты на сервере
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

    // Агрегируем в объекты {значение: количество}
    const countArray = (arr) => {
      const count = {};
      arr?.forEach(item => {
        count[item] = (count[item] || 0) + 1;
      });
      return count;
    };

    res.json({
      shortCode: link.shortCode,
      originalUrl: link.originalUrl,
      totalClicks: result.totalClicks,
      browsers: countArray(result.browsers),
      os: countArray(result.osList),
      countries: countArray(result.countries),
      cities: countArray(result.cities)
      // НЕТ IP, user-agent, точного времени, _id кликов
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Удалить ссылку (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await Link.updateOne(
      { _id: req.params.id, userId: req.user.id },
      { isActive: false }
    );
    res.json({ message: 'Ссылка удалена' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;