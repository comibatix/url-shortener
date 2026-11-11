const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Link = require('../models/Link');
const Click = require('../models/Click');
const UAParser = require('ua-parser-js');
const rateLimit = require('express-rate-limit');

// Кэш для геоданных (IP -> данные)
const geoCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 час

// Функция хэширования IP (SHA-256)
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};

//  Функция анонимизации IP для сторонних API (защита приватности)
// Превращает "192.168.1.45" в "192.168.1.0", скрывая точный адрес от ip-api.com
const getAnonymizedIpForApi = (ip) => {
  if (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '8.8.8.8'; // Заглушка для локальной разработки, чтобы ip-api не возвращал ошибку
  }
  // Скрываем последний октет для IPv4
  return ip.replace(/\.\d+$/, '.0');
};


// Фоновая обработка клика
async function processClickInBackground(linkId, ip, userAgent) {
  try {
    const parser = new UAParser(userAgent);
    const ua = parser.getResult();

    let country = 'Unknown';
    let city = 'Unknown';
    let region = 'Unknown';

    const cached = geoCache.get(ip);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      country = cached.country;
      city = cached.city;
      region = cached.region;
    } else {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        //  Используем анонимизированный IP для запроса к стороннему сервису
        const apiIp = getAnonymizedIpForApi(ip);
        
        const response = await fetch(`https://ip-api.com/json/${apiIp}?fields=status,country,regionName,city`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success') {
            country = data.country || 'Unknown';
            city = data.city || 'Unknown';
            region = data.regionName || 'Unknown';
            geoCache.set(ip, { country, city, region, timestamp: Date.now() });
          }
        }
      } catch (err) {
        console.log('Geo fetch failed or timed out, using defaults');
      }
    }

    const hashedIP = hashIP(ip);
    const truncatedUA = userAgent?.substring(0, 200) || '';

    await Click.create({
      linkId,
      ip: hashedIP,
      browser: `${ua.browser.name || 'Unknown'} ${ua.browser.version || ''}`.trim(),
      os: `${ua.os.name || 'Unknown'} ${ua.os.version || ''}`.trim(),
      device: ua.device.type || 'desktop',
      userAgent: truncatedUA,
      country,
      city,
      region
    });
  } catch (error) {
    console.error('Ошибка фонового сохранения клика:', error);
  }
}

// Единый публичный роут
router.get('/:shortCode', async (req, res) => {
  let shortCode = req.params.shortCode;

  //  УМНАЯ ОБРАБОТКА "+": 
  if (shortCode.endsWith('+')) {
    const codeWithoutPlus = shortCode.slice(0, -1);
    const link = await Link.findOne({ shortCode: codeWithoutPlus });
    
    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }
    
    //  Проверяем: есть ли токен авторизации ИЛИ явно запрошен JSON
    const isApiRequest = req.headers.authorization || 
                         (req.headers.accept && req.headers.accept.includes('application/json'));
    
    if (isApiRequest) {
      // Возвращаем JSON для API запросов
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
          if (item) count[item] = (count[item] || 0) + 1;
        });
        return count;
      };
      
      return res.json({
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
    }
    
    // Если запрос из обычного браузера (без токена и без Accept: json) — редирект на красивую страницу
    return res.redirect(302, `http://localhost:5173/stats/${codeWithoutPlus}`);
  }

  //  ОБЫЧНЫЙ РЕДИРЕКТ (без "+")
  try {
    const link = await Link.findOne({ shortCode });
    
    if (!link || !link.isActive) {
      return res.status(410).send('Ссылка неактивна или истекла');
    }

    if (link.expiresAt && link.expiresAt < new Date()) {
      await Link.updateOne({ _id: link._id }, { isActive: false });
      return res.status(410).send('Ссылка истекла');
    }

    const ip = req.ip || '0.0.0.0';
    Link.updateOne({ _id: link._id }, { $inc: { totalClicks: 1 } }).catch(console.error);
    res.redirect(302, link.originalUrl);
    processClickInBackground(link._id, ip, req.headers['user-agent']);

  } catch (error) {
    console.error('Ошибка редиректа:', error);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;