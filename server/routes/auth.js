const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

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

// Валидация email
const isValidEmail = (email) => {
  return typeof email === 'string' && 
         /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Регистрация
router.post('/register', 
  // Валидация схемы
  [
    body('email')
      .isString().withMessage('Email должен быть строкой')
      .isEmail().withMessage('Некорректный email')
      .normalizeEmail()
      .isLength({ min: 1, max: 254 }).withMessage('Email слишком длинный'),
    body('password')
      .isString().withMessage('Пароль должен быть строкой')
      .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов')
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Приводим к нижнему регистру (после normalizeEmail)
      const normalizedEmail = email.toLowerCase();

      // Проверяем, существует ли пользователь
      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(400).json({ error: 'Пользователь уже существует' });
      }

      // Хэшируем пароль
      const hashedPassword = await bcrypt.hash(password, 10);

      // Создаем пользователя
      const user = new User({
        email: normalizedEmail,
        password: hashedPassword
      });

      await user.save();

      res.status(201).json({ message: 'Пользователь создан' });
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      res.status(500).json({ error: 'Ошибка сервера' });
    }
  }
);

// Логин
router.post('/login',
  // Валидация схемы
  [
    body('email')
      .isString().withMessage('Email должен быть строкой')
      .isEmail().withMessage('Некорректный email')
      .normalizeEmail()
      .isLength({ min: 1, max: 254 }).withMessage('Email слишком длинный'),
    body('password')
      .isString().withMessage('Пароль должен быть строкой')
      .isLength({ min: 6 }).withMessage('Пароль должен быть минимум 6 символов')
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { email, password } = req.body;

      // Приводим к нижнему регистру (после normalizeEmail)
      const normalizedEmail = email.toLowerCase();

      // Ищем пользователя
      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(400).json({ error: 'Неверный email или пароль' });
      }

      // Проверяем пароль
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ error: 'Неверный email или пароль' });
      }

      // Создаем JWT токен
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