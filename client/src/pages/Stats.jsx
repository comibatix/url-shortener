import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { QRCodeSVG } from 'qrcode.react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { fetchLinkStats, clearCurrentStats, clearError } from '../store/linksSlice';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import QrCodeIcon from '@mui/icons-material/QrCode';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import BarChartIcon from '@mui/icons-material/BarChart';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CodeIcon from '@mui/icons-material/Code';
import LanguageIcon from '@mui/icons-material/Language';
import ComputerIcon from '@mui/icons-material/Computer';
import PublicIcon from '@mui/icons-material/Public';
import { useTheme } from '@mui/material/styles';

const COLORS = ['#2196f3', '#9c27b0', '#4caf50', '#ff5722', '#00bcd4', '#795548'];

// Вспомогательная функция для преобразования объекта { "Chrome": 5 } в массив [{ name: "Chrome", value: 5 }]
const formatAggregatedData = (dataObj) => {
  if (!dataObj) return [];
  return Object.entries(dataObj).map(([name, value]) => ({ name, value }));
};

function Stats() {
  const { shortCode } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentStats, loading, error } = useSelector((state) => state.links);
  const [showQR, setShowQR] = useState(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    dispatch(clearCurrentStats());
    dispatch(clearError());
    dispatch(fetchLinkStats(shortCode));
  }, [dispatch, shortCode]);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Ссылка скопирована!');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  };

  //  Теперь мы берем данные из агрегированных объектов, а не из массива clicks
  const browsersData = useMemo(() => formatAggregatedData(currentStats?.browsers), [currentStats]);
  const osData = useMemo(() => formatAggregatedData(currentStats?.os), [currentStats]);
  const countriesData = useMemo(() => formatAggregatedData(currentStats?.countries), [currentStats]);
  const citiesData = useMemo(() => formatAggregatedData(currentStats?.cities), [currentStats]);

  if (loading) return <Typography align="center" sx={{ mt: 8 }}>Загрузка...</Typography>;
  if (error) return <Container maxWidth="md" sx={{ mt: 6 }}><Alert severity="error">{error}</Alert></Container>;
  if (!currentStats) return <Typography align="center" sx={{ mt: 8 }}>Нет данных</Typography>;

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BarChartIcon /> Статистика: {currentStats.shortCode}
      </Typography>

      <Card elevation={3} sx={{ p: 4, mb: 4 }}>
        <CardContent>
          <Typography variant="subtitle2" color="text.secondary" gutterBottom>
            Оригинальный URL:
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ wordBreak: 'break-all', mb: 3, p: 2, bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
          >
            {currentStats.originalUrl}
          </Typography>

          <Stack spacing={2}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
              <Typography variant="body1"><strong>Всего кликов:</strong></Typography>
              <Typography variant="body1">{currentStats.totalClicks}</Typography>
            </Box>
            {currentStats.createdAt && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body1"><strong>Создана:</strong></Typography>
                <Typography variant="body1">{new Date(currentStats.createdAt).toLocaleString('ru-RU')}</Typography>
              </Box>
            )}
            {currentStats.expiresAt && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccessTimeIcon fontSize="small" /><strong>Истекает:</strong></Typography>
                <Typography variant="body1" color="error">{new Date(currentStats.expiresAt).toLocaleString('ru-RU')}</Typography>
              </Box>
            )}
            {currentStats.customCode && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider', pb: 1 }}>
                <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CodeIcon fontSize="small" /><strong>Тип:</strong></Typography>
                <Typography variant="body1">Кастомный код</Typography>
              </Box>
            )}
          </Stack>

          <Stack direction="row" spacing={2} sx={{ mt: 3, flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              startIcon={<ContentCopyIcon />}
              onClick={() => copyToClipboard(`http://localhost:5000/${currentStats.shortCode}`)}
              sx={{ bgcolor: '#ffd700', color: '#0a0e27', '&:hover': { bgcolor: '#f5c518' } }}
            >
              Копировать ссылку
            </Button>
            <Button 
              variant="outlined"
              startIcon={<QrCodeIcon />}
              onClick={() => setShowQR(!showQR)}
              sx={{ borderColor: '#9c27b0', color: '#9c27b0' }}
            >
              {showQR ? 'Скрыть QR' : 'Показать QR'}
            </Button>
          </Stack>

          {showQR && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center', p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 3, maxWidth: 260, margin: '20px auto 0' }}>
              <QRCodeSVG value={`http://localhost:5000/${currentStats.shortCode}`} size={200} />
            </Box>
          )}
        </CardContent>
      </Card>

      {currentStats.totalClicks === 0 ? (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
          Пока нет кликов. Поделись ссылкой!
        </Typography>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3, mb: 4 }}>
            
            <Card elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LanguageIcon /> Браузеры
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={browsersData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {browsersData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ComputerIcon /> Операционные системы
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={osData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {osData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>

            <Card elevation={3} sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PublicIcon /> Страны
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={countriesData} cx="50%" cy="50%" outerRadius={80} dataKey="value">
                    {countriesData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </Box>

          {/* 
            Примечание: Раздел "История кликов" удалён, так как теперь мы отдаём 
            только агрегированные данные для защиты приватности пользователей (IP, точное время).
          */}
        </>
      )}

      <Button 
        variant="contained" 
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/dashboard')}
        sx={{ mt: 4 }}
      >
        Назад к списку
      </Button>
    </Container>
  );
}

export default Stats;