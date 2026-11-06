const API_URL = 'http://localhost:5000'; 

const getToken = () => localStorage.getItem('token');

const request = async (url, options = {}) => {
  const token = getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Ошибка сервера');
  }

  return data;
};

export const register = (email, password) => 
  request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const login = (email, password) => 
  request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

export const createLink = (originalUrl, customCode = '', expiresIn = 0) => 
  request('/api/links', {
    method: 'POST',
    body: JSON.stringify({ originalUrl, customCode, expiresIn }),
  });

export const getLinks = (url = '/api/links') => 
  request(url);

//   правильный путь к публичной статистике
export const getLinkStats = (shortCode) => 
  request(`/${shortCode}/stats`);

export const deleteLink = (id) => 
  request(`/api/links/${id}`, {
    method: 'DELETE',
  });

// Экспорт статистики в CSV
export const exportStatsToCSV = (stats) => {
  // Примечание: так как теперь бэкенд отдает агрегированные данные, 
  // этот функционал может потребовать доработки, если нужен экспорт сырых кликов.
  // Но пока оставим как есть, чтобы не ломать текущую логику.
  const headers = ['Дата,IP,Регион,Страна,Город,Браузер,ОС,Устройство'];
  const rows = stats.clicks ? stats.clicks.map(click => 
    `"${new Date(click.date).toLocaleString('ru-RU')}","${click.ip}","${click.region || ''}","${click.country || ''}","${click.city || ''}","${click.browser}","${click.os}","${click.device}"`
  ) : [];
  
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `stats_${stats.shortCode}.csv`;
  link.click();
};