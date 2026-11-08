const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

//  1. НАСТРОЙКИ MONGOOSE (ДО подключения)
// Защита от NoSQL инъекций (вторая линия защиты по требованию ментора)
mongoose.set('sanitizeFilter', true);

//  2. ДОВЕРИЕ ПРОКСИ
// Доверяем первому прокси (Nginx/Heroku), чтобы req.ip показывал реальный IP клиента
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

//  3. ПРОВЕРКА JWT_SECRET НА СТАРТЕ (требование ментора)
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your_super_secret_key_change_this') {
  console.error('');
  console.error('❌ ════════════════════════════════════════════════════════');
  console.error('❌ ОШИБКА: JWT_SECRET не настроен или использует заглушку!');
  console.error('❌ ════════════════════════════════════════════════════════');
  console.error('Создайте файл server/.env и добавьте:');
  console.error('JWT_SECRET=ваш_секретный_ключ_минимум_32_символа');
  console.error('');
  process.exit(1); // Останавливаем сервер, если секрета нет
}

//  4. ПОДКЛЮЧЕНИЕ К MONGODB (ИСПРАВЛЕНА ЦЕПОЧКА ПРОМИСОВ)
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB подключен'))
  .catch(err => {
    console.error('❌ Ошибка подключения к MongoDB:', err);
    process.exit(1);
  });

//  5. НАСТРОЙКА RATE LIMIT для авторизации (защита от перебора)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // максимум 10 запросов с одного IP
  message: { error: 'Слишком много попыток. Попробуйте позже.' },
  standardHeaders: true, 
  legacyHeaders: false, 
});

//  6. ПОДКЛЮЧЕНИЕ РОУТОВ
// Публичные роуты (редирект и статистика) — БЕЗ префикса /api
const publicRoutes = require('./routes/public');
app.use('/', publicRoutes);

// Применяем Rate Limit ТОЛЬКО к роутам авторизации
app.use('/api/auth', authLimiter);

const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');

app.use('/api/auth', authRoutes);
app.use('/api/links', linkRoutes);

// Базовый роут для проверки работы API
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener API работает' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});