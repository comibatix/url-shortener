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
//  Доверяем прокси ТОЛЬКО если это явно разрешено в .env
if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
  console.log('✅ Trust proxy включён (сервер работает за Nginx/прокси)');
} else {
  console.log('ℹ️ Trust proxy отключён (локальный запуск, защита от подделки IP)');
}

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
//  1. СТРОГИЙ лимит для входа и регистрации (защита от взлома пароля)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 10, // всего 10 попыток
  message: { error: 'Слишком много попыток входа. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

//  2. МЯГКИЙ лимит для переходов по коротким ссылкам (с запасом для офисов)
const redirectLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 200, // 200 переходов (с запасом, чтобы не блокировать обычных пользователей)
  message: 'Слишком много переходов. Попробуйте позже.',
  standardHeaders: true,
  legacyHeaders: false,
});

//  3. УМЕРЕННЫЙ лимит для API (создание ссылок, дашборд)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 60, // 60 запросов к API
  message: { error: 'Слишком много запросов к API. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

//  6. ПОДКЛЮЧЕНИЕ РОУТОВ С ПРАВИЛЬНЫМИ ЛИМИТАМИ

// 1. Публичные редиректы (только мягкий лимит)
const publicRoutes = require('./routes/public');
app.use('/', redirectLimiter, publicRoutes); 

// 2. Авторизация (строгий лимит)
const authRoutes = require('./routes/auth');
app.use('/api/auth', authLimiter, authRoutes); 

// 3. API ссылок (умеренный лимит)
const linkRoutes = require('./routes/links');
app.use('/api/links', apiLimiter, linkRoutes); 

// Базовый роут для проверки работы API
app.get('/', (req, res) => {
  res.json({ message: 'URL Shortener API работает' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});