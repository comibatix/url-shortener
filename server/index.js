const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const UAParser = require('ua-parser-js');
require('dotenv').config();

const Link = require('./models/Link');
const linkRoutes = require('./routes/links');
const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/links', linkRoutes);
app.use('/api/auth', authRoutes);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

app.get('/', (req, res) => {
  res.send('🚀 URL Shortener API is running!');
});

// Функция для получения региона по IP
async function getRegionByIP(ip) {
  try {
    // Убираем префикс ::ffff: если есть
    const cleanIP = ip.replace('::ffff:', '');
    
    // Если локальный IP, возвращаем заглушку
    if (cleanIP === '127.0.0.1' || cleanIP === '::1') {
      return { region: 'Local', country: 'Local', city: 'Local' };
    }

    const response = await fetch(`http://ip-api.com/json/${cleanIP}`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        region: data.regionName || 'Unknown',
        country: data.country || 'Unknown',
        city: data.city || 'Unknown'
      };
    }

    return { region: 'Unknown', country: 'Unknown', city: 'Unknown' };
  } catch (error) {
    console.error('Ошибка получения региона:', error);
    return { region: 'Unknown', country: 'Unknown', city: 'Unknown' };
  }
}

app.get('/:shortCode', async (req, res) => {
  try {
    let { shortCode } = req.params;
    let showStats = false;

    if (shortCode.endsWith('+')) {
      shortCode = shortCode.slice(0, -1);
      showStats = true;
    }

    const link = await Link.findOne({ shortCode });

    if (!link) {
      return res.status(404).json({ error: 'Ссылка не найдена' });
    }

    if (showStats) {
      return res.json({
        shortCode: link.shortCode,
        originalUrl: link.originalUrl,
        totalClicks: link.clicks.length,
        clicks: link.clicks,
        createdAt: link.createdAt
      });
    }

    const parser = new UAParser(req.headers['user-agent']);
    const browser = parser.getBrowser();
    const os = parser.getOS();
    const device = parser.getDevice();

    // Получаем регион по IP
    const regionData = await getRegionByIP(req.ip);

    link.clicks.push({
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      browser: `${browser.name} ${browser.version || ''}`.trim(),
      os: `${os.name} ${os.version || ''}`.trim(),
      device: device.type || 'desktop',
      region: regionData.region,
      country: regionData.country,
      city: regionData.city,
      date: new Date()
    });

    await link.save();
    res.redirect(link.originalUrl);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});