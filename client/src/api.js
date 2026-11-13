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

export const getLinkStats = (shortCode) => 
  request(`/${shortCode}+`, {
    headers: { 'Accept': 'application/json' }
  });

// Получение истории кликов по shortCode
export const getLinkClicks = (shortCode, page = 1, limit = 50) => 
  request(`/api/links/${shortCode}/clicks?page=${page}&limit=${limit}`);

export const deleteLink = (id) => 
  request(`/api/links/${id}`, {
    method: 'DELETE',
  });

// Экспорт агрегированной статистики в CSV (безопасно, без сырых IP)
export const exportStatsToCSV = (stats) => {
  // \uFEFF нужен для корректного отображения кириллицы в Excel
  let csvContent = "data:text/csv;charset=utf-8,\uFEFFКатегория,Значение,Количество кликов\n";
  
  const addRows = (category, dataObj) => {
    if (!dataObj) return;
    Object.entries(dataObj).forEach(([key, value]) => {
      csvContent += `${category},"${key}",${value}\n`;
    });
  };

  addRows("Браузер", stats.browsers);
  addRows("ОС", stats.os);
  addRows("Страна", stats.countries);
  addRows("Город", stats.cities);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `stats_${stats.shortCode}.csv`;
  link.click();
};