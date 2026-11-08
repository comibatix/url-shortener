import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import { addLink, clearCurrentLink, clearError } from '../store/linksSlice';

import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import MenuItem from '@mui/material/MenuItem';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode';
import LinkIcon from '@mui/icons-material/Link';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useTheme } from '@mui/material/styles';

function Home() {
  const [url, setUrl] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresIn, setExpiresIn] = useState('0');
  const [showQR, setShowQR] = useState(false);
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const { currentLink, loading, error } = useSelector((state) => state.links);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  const isValidUrl = (string) => {
    try {
      const u = new URL(string);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const isValidCustomCode = (code) => {
    if (!code || code.trim() === '') return true;
    return /^[a-zA-Z0-9-]+$/.test(code.trim());
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Ссылка скопирована!');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.warning('Войдите, чтобы создавать ссылки');
      return;
    }
    if (!isValidUrl(url)) {
      toast.error('Введите корректный URL');
      return;
    }
    if (customCode && !isValidCustomCode(customCode)) {
      toast.error('Код должен содержать только латинские буквы (a-z), цифры (0-9) и дефис (-)');
      return;
    }

    dispatch(clearError());
    dispatch(clearCurrentLink());
    
    const result = await dispatch(addLink({ originalUrl: url, customCode, expiresIn: parseInt(expiresIn) }));

    if (addLink.fulfilled.match(result)) {
      setUrl('');
      setCustomCode('');
      setExpiresIn('0');
      setShowQR(false);
      toast.success('Ссылка успешно создана!');
    } else {
      toast.error(result.payload || 'Ошибка при создании ссылки');
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 5 }}>
        <Typography 
          variant="h3" 
          gutterBottom
          sx={{ 
            background: isDark 
              ? 'linear-gradient(90deg, #ffd700 0%, #f5c518 50%, #ffffff 100%)' 
              : 'linear-gradient(90deg, #1a1f3a 0%, #2d1b4e 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Сократи свою ссылку
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Вставь длинный URL и получи короткую, красивую ссылку
        </Typography>
      </Box>

      <Card elevation={3} sx={{ p: 4, mb: 4 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={3}>
            <TextField
              fullWidth
              label="Длинная ссылка"
              placeholder="https://example.com/очень-длинная-ссылка"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              disabled={loading}
              variant="outlined"
            />
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <TextField
                fullWidth
                label="Кастомный код (необязательно)"
                placeholder="my-link"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value)}
                disabled={loading}
                sx={{ flex: 1 }}
              />
              <TextField
                select
                fullWidth
                label="Срок действия"
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value)}
                disabled={loading}
                sx={{ flex: 1 }}
              >
                <MenuItem value="0">Бессрочно</MenuItem>
                <MenuItem value="7">7 дней</MenuItem>
                <MenuItem value="30">30 дней</MenuItem>
                <MenuItem value="90">90 дней</MenuItem>
              </TextField>
            </Box>
            <Button 
              type="submit" 
              variant="contained" 
              size="large" 
              disabled={loading || !isAuthenticated}
              sx={{ 
                py: 1.5, 
                fontSize: '1.1rem',
                bgcolor: '#ffd700',
                color: '#0a0e27',
                '&:hover': { bgcolor: '#f5c518' },
              }}
            >
              {loading ? 'Создание...' : 'Сократить'}
            </Button>
          </Stack>
        </form>
      </Card>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {!isAuthenticated && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Link to="/login" style={{ fontWeight: 'bold' }}>Войди</Link> или <Link to="/register" style={{ fontWeight: 'bold' }}>зарегистрируйся</Link>, чтобы сохранять ссылки и видеть статистику.
        </Alert>
      )}

      {currentLink && (
        <Card elevation={4} sx={{ p: 4 }}>
          <CardContent>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon fontSize="small" /> Оригинальная ссылка:
            </Typography>
            <Typography 
              variant="body2" 
              sx={{ 
                wordBreak: 'break-all', 
                mb: 3, 
                p: 2, 
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                borderRadius: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                fontSize: '0.9rem',
                lineHeight: 1.6,
              }}
            >
              {currentLink.originalUrl || url}
            </Typography>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LinkIcon fontSize="small" /> Короткая ссылка:
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <TextField 
                fullWidth 
                value={`http://localhost:5000/${currentLink.shortCode}`} 
                InputProps={{ readOnly: true }} 
                size="small" 
              />
              <Button 
                variant="contained" 
                startIcon={<ContentCopyIcon />} 
                onClick={() => copyToClipboard(`http://localhost:5000/${currentLink.shortCode}`)}
                sx={{ bgcolor: '#ffd700', color: '#0a0e27', '&:hover': { bgcolor: '#f5c518' } }}
              >
                Копировать
              </Button>
            </Stack>

            <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BarChartIcon fontSize="small" /> Статистика:
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 3 }}>
              <TextField 
                fullWidth 
                value={`http://localhost:5000/${currentLink.shortCode}+`} 
                InputProps={{ readOnly: true }} 
                size="small" 
              />
              <Button 
                variant="contained" 
                startIcon={<ContentCopyIcon />} 
                onClick={() => copyToClipboard(`http://localhost:5000/${currentLink.shortCode}+`)}
                sx={{ bgcolor: '#ffd700', color: '#0a0e27', '&:hover': { bgcolor: '#f5c518' } }}
              >
                Копировать
              </Button>
            </Stack>

            {currentLink.expiresAt && (
              <Alert severity="warning" sx={{ mb: 2 }} icon={<AccessTimeIcon />}>
                Истекает: {new Date(currentLink.expiresAt).toLocaleString('ru-RU')}
              </Alert>
            )}

            <Box sx={{ textAlign: 'center', mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
              <Button 
                variant="outlined" 
                startIcon={<QrCodeIcon />} 
                onClick={() => setShowQR(!showQR)}
                sx={{ borderColor: '#9c27b0', color: '#9c27b0' }}
              >
                {showQR ? 'Скрыть QR-код' : 'Показать QR-код'}
              </Button>
              
              {showQR && (
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 3, maxWidth: 260, margin: '20px auto 0' }}>
                  <QRCodeSVG value={`http://localhost:5000/${currentLink.shortCode}`} size={200} />
                </Box>
              )}
            </Box>
          </CardContent>
        </Card>
      )}
    </Container>
  );
}

export default Home;