const express = require('express');
const router = express.Router();
const Link = require('../models/Link');
const Click = require('../models/Click');
const UAParser = require('ua-parser-js');

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

    const ip = req.ip || req.connection.remoteAddress;

    const parser = new UAParser(req.headers['user-agent']);
    const ua = parser.getResult();

    const click = new Click({
      linkId: link._id,
      ip: ip,
      browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
      os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
      device: ua.device.type || 'desktop',
      userAgent: req.headers['user-agent']?.substring(0, 500) || ''
    });

    click.save().catch(err => console.error('Ошибка сохранения клика:', err));

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

    await Link.updateOne(
      { _id: link._id },
      { $inc: { totalClicks: 1 } }
    );

    res.redirect(302, link.originalUrl);
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
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;