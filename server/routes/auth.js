const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Валидация email
const isValidEmail = (email) => {
  return typeof email === 'string' && 
         /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ВАЛИДАЦИЯ: проверяем, что email — строка
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email должен быть строкой' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    // Приводим к нижнему регистру
    const normalizedEmail = email.toLowerCase().trim();

    // Проверяем длину пароля
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Пароль должен быть минимум 6 символов' });
    }

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
});

// Логин
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ВАЛИДАЦИЯ: проверяем, что email — строка
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Email должен быть строкой' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Некорректный email' });
    }

    // Приводим к нижнему регистру
    const normalizedEmail = email.toLowerCase().trim();

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
});

module.exports = router;