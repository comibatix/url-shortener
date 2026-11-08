const { body, validationResult } = require('express-validator');

// Валидация для регистрации
const validateRegister = [
  body('email')
    .isString()
    .withMessage('Email должен быть строкой')
    .isEmail()
    .withMessage('Неверный формат email')
    .normalizeEmail()  // Приводит к нижнему регистру
    .trim(),
  body('password')
    .isString()
    .withMessage('Пароль должен быть строкой')
    .isLength({ min: 6 })
    .withMessage('Пароль должен быть не менее 6 символов'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  }
];

// Валидация для логина
const validateLogin = [
  body('email')
    .isString()
    .withMessage('Email должен быть строкой')
    .isEmail()
    .withMessage('Неверный формат email')
    .normalizeEmail()
    .trim(),
  body('password')
    .isString()
    .withMessage('Пароль должен быть строкой')
    .notEmpty()
    .withMessage('Пароль обязателен'),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
  }
];

module.exports = { validateRegister, validateLogin };