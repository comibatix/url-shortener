const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'Токен не предоставлен' });
    }

    // Извлекаем токен (формат: "Bearer TOKEN")
    const token = authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Токен не найден' });
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Добавляем информацию о пользователе в request
    req.user = decoded;
    
    // Передаём управление следующему middleware/роуту
    next();
  } catch (error) {
    console.error('❌ Ошибка в middleware auth:', error);
    return res.status(401).json({ error: 'Неверный токен' });
  }
};

module.exports = authMiddleware;