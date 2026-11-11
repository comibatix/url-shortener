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

//  3. СТРОГАЯ ПРОВЕРКА JWT_SECRET НА СТАРТЕ 

// Список запрещённых (известных) секретов
const INVALID_SECRETS = [
  'your_super_secret_key_change_this',
  'your_super_secret_key_change_me',
  'secret',
  '123456',
  'password',
  'jwt_secret',
  'your_jwt_secret',
  'change_me',
  'change_this',
];

// Проверка 1: Существует ли JWT_SECRET?
if (!process.env.JWT_SECRET) {
  console.error('');
  console.error('❌ ═══════════════════════════════════════════════════════');
  console.error('❌ ОШИБКА: JWT_SECRET не настроен!');
  console.error('❌ ════════════════════════════════════════════════════════');
  console.error('Создайте файл server/.env и добавьте:');
  console.error('JWT_SECRET=<сгенерируйте через: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))">');
  console.error('');
  process.exit(1); // Остановить сервер
}

// Проверка 2: Длина секрета (минимум 32 символа)
if (process.env.JWT_SECRET.length < 32) {
  console.error('');
  console.error(' ════════════════════════════════════════════════════════');
  console.error('❌ ОШИБКА: JWT_SECRET слишком короткий (минимум 32 символа)!');
  console.error('❌ ════════════════════════════════════════════════════════');
  console.error('Сгенерируйте новый секрет:');
  console.error('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('');
  process.exit(1); // Остановить сервер
}

// Проверка 3: Не является ли секрет известной заглушкой?
if (INVALID_SECRETS.includes(process.env.JWT_SECRET)) {
  console.error('');
  console.error('❌ ════════════════════════════════════════════════════════');
  console.error('❌ ОШИБКА: JWT_SECRET использует известную заглушку!');
  console.error('❌ ════════════════════════════════════════════════════════');
  console.error('Сгенерируйте уникальный секрет:');
  console.error('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  console.error('');
  process.exit(1); // Остановить сервер
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