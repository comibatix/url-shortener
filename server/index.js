const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit'); // ⚠️ Добавили rate limit
require('dotenv').config();

// Защита от NoSQL инъекций
mongoose.set('sanitizeFilter', true);

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Проверка JWT_SECRET на старте
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_key_change_me') {
  console.error('❌ ОШИБКА: JWT_SECRET не настроен! Проверь файл .env');
  process.exit(1);
}

// ⚠️ НАСТРОЙКА RATE LIMIT для авторизации (10 попыток за 15 минут)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 запросов с одного IP
  message: { error: 'Слишком много попыток. Попробуйте позже.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Подключение к MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB подключен'))
  .catch(err => {
    console.error('❌ Ошибка подключения к MongoDB:', err);
    process.exit(1);
  });

// Публичные роуты (редирект и статистика) — БЕЗ префикса /api
const publicRoutes = require('./routes/public');
app.use('/', publicRoutes);

// ⚠️ ПРИМЕНЯЕМ RATE LIMIT к роутам авторизации
app.use('/api/auth', authLimiter);

// API роуты — с префиксом /api
const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');

app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);

// Базовый роут
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener API работает' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});