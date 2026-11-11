const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Link = require('../models/Link');
const Click = require('../models/Click');
const UAParser = require('ua-parser-js');
const rateLimit = require('express-rate-limit');
const maxmind = require('maxmind'); 

// переменная и функция для загрузки базы при старте сервера
let geoLookup = null;

async function initGeoLookup() {
  if (!geoLookup) {
    try {
      // Путь к файлу относительно папки server
      geoLookup = await maxmind.open('./GeoLite2-City.mmdb');
      console.log('✅ База геолокации GeoLite2 успешно загружена локально');
    } catch (error) {
      console.error('❌ Не удалось загрузить базу GeoLite2. Убедитесь, что файл GeoLite2-City.mmdb лежит в папке server/. Ошибка:', error.message);
    }
  }
}

// Запускаем инициализацию сразу при загрузке файла
initGeoLookup();

// Функция хэширования IP (SHA-256) - осталась без изменений
const hashIP = (ip) => {
  return crypto.createHash('sha256').update(ip).digest('hex');
};


// новая версия функции с локальным поиском
async function processClickInBackground(linkId, ip, userAgent) {
  try {

    const parser = new UAParser(userAgent);
    const ua = parser.getResult();

    let country = 'Unknown';
    let city = 'Unknown';
    let region = 'Unknown';

    // Пропускаем локальные IP (но мы их уже подменили выше, если они были локальными)
    if (ip !== '127.0.0.1' && ip !== '::1' && ip !== '::ffff:127.0.0.1') {
      if (geoLookup) {
        const response = geoLookup.get(ip);
        
        if (response) {
          country = response.country?.names?.ru || response.country?.names?.en || 'Unknown';
          city = response.city?.names?.ru || response.city?.names?.en || 'Unknown';
          region = response.subdivisions?.[0]?.names?.ru || response.subdivisions?.[0]?.names?.en || 'Unknown';
        } else {
          console.warn(`⚠️ Геоданные не найдены в базе для IP: ${ip}`);
        }
      } else {
        console.warn('⚠️ База геолокации не инициализирована. Проверьте наличие файла .mmdb');
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

// Единый публичный роут (остался без изменений)
router.get('/:shortCode', async (req, res) => {
  let shortCode = req.params.shortCode;

  // УМНАЯ ОБРАБОТКА "+": 
  if (shortCode.endsWith('+')) {
    const codeWithoutPlus = shortCode.slice(0, -1);
    const link = await Link.findOne({ shortCode: codeWithoutPlus });
    
    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }
    
    // Проверяем: есть ли токен авторизации ИЛИ явно запрошен JSON
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
    
    // Если запрос из обычного браузера — редирект на красивую страницу
    return res.redirect(302, `http://localhost:5173/stats/${codeWithoutPlus}`);
  }

  // ОБЫЧНЫЙ РЕДИРЕКТ (без "+")
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
    
    // Запускаем фоновую обработку (теперь она использует локальную базу)
    processClickInBackground(link._id, ip, req.headers['user-agent']);

  } catch (error) {
    console.error('Ошибка редиректа:', error);
    res.status(500).send('Ошибка сервера');
  }
});

module.exports = router;