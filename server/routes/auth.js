const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const rateLimit = require('express-rate-limit');

//  ЗАЩИТА ОТ ПЕРЕБОРА: Rate limit для auth роутов (20 попыток за 15 минут)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 20, 
  message: { error: 'Слишком много попыток. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(authLimiter);

// Middleware для обработки ошибок валидации
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: errors.array()[0].msg 
    });
  }
  next();
};

// Регистрация
router.post('/register', 
  [
    body('email')
      .isString().withMessage('Email должен быть строкой')
      .isEmail().withMessage('Некорректный email')
      .normalizeEmail()
      .isLength({ min: 1, max: 254 }).withMessage('Email слишком длинный'),
    body('password')
      .isString().withMessage('Пароль должен быть строкой')
      .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      //  ЯВНАЯ ПРОВЕРКА ТИПА (защита от NoSQL инъекций)
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Неверный формат данных' });
      }

      const normalizedEmail = email.toLowerCase();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = new User({
        email: normalizedEmail,
        password: hashedPassword
      });

            await user.save();

      //  1. Создаём JWT токен для нового пользователя
      const token = jwt.sign(
        { userId: user._id },        // Внутри токена храним ID пользователя
        process.env.JWT_SECRET,      // Подписываем нашим секретным ключом
        { expiresIn: '7d' }          // Токен будет действителен 7 дней
      );

      //  2. Отправляем клиенту сообщение, токен и ID пользователя
      res.status(201).json({ 
        message: 'Пользователь создан',
        token,
        userId: user._id 
      });
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// Логин
router.post('/login',
  [
    body('email')
      .isString().withMessage('Email должен быть строкой')
      .isEmail().withMessage('Некорректный email')
      .normalizeEmail()
      .isLength({ min: 1, max: 254 }).withMessage('Email слишком длинный'),
    body('password')
      .isString().withMessage('Пароль должен быть строкой')
      .isLength({ min: 6 }).withMessage('Пароль должен быть не менее 6 символов')
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      //  ЯВНАЯ ПРОВЕРКА ТИПА (защита от NoSQL инъекций)
      if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Неверный формат данных' });
      }

      const normalizedEmail = email.toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ error: 'Неверный email или пароль' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Неверный email или пароль' });
      }

      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({ token, userId: user._id });
    } catch (error) {
      console.error('Ошибка логина:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

module.exports = router;