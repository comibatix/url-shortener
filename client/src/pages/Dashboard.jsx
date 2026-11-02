import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { fetchLinks, removeLink } from '../store/linksSlice';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import BarChartIcon from '@mui/icons-material/BarChart';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import Pagination from '@mui/material/Pagination';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useTheme } from '@mui/material/styles';

const ITEMS_PER_PAGE = 5;

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { links, loading, error } = useSelector((state) => state.links);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => {
    dispatch(fetchLinks(searchQuery));
  }, [dispatch, searchQuery]);

  const handleDelete = async (shortCode) => {
    if (!window.confirm('Удалить ссылку?')) return;
    dispatch(removeLink(shortCode));
    toast.success('Ссылка удалена');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success('Ссылка скопирована!');
    }).catch(() => {
      toast.error('Не удалось скопировать');
    });
  };

  const totalPages = Math.ceil(links.length / ITEMS_PER_PAGE);
  const paginatedLinks = links.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 6, mb: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        Мои ссылки
      </Typography>

      <TextField
        fullWidth
        placeholder="Поиск по URL или коду..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        sx={{ mb: 4 }}
        InputProps={{
          startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
        }}
      />

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {loading ? (
        <Typography align="center">Загрузка...</Typography>
      ) : links.length === 0 ? (
        <Typography align="center" color="text.secondary">
          У тебя пока нет ссылок. <a href="/" style={{ fontWeight: 'bold' }}>Создать первую</a>
        </Typography>
      ) : (
        <>
          <Stack spacing={3}>
            {paginatedLinks.map(link => (
              <Card key={link._id} elevation={2}>
                <CardContent>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                    http://localhost:5000/{link.shortCode}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1, wordBreak: 'break-all' }}>
                    Оригинал: {link.originalUrl}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Кликов: {link.clicks ? link.clicks.length : 0} | Создана: {new Date(link.createdAt).toLocaleString('ru-RU')}
                  </Typography>
                  {link.expiresAt && (
                    <Alert severity="warning" sx={{ mb: 2, py: 0.5 }} icon={<AccessTimeIcon />}>
                      Истекает: {new Date(link.expiresAt).toLocaleString('ru-RU')}
                    </Alert>
                  )}
                  <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                    <Button 
                      variant="contained" 
                      startIcon={<ContentCopyIcon />}
                      onClick={() => copyToClipboard(`http://localhost:5000/${link.shortCode}`)}
                      sx={{ bgcolor: '#ffd700', color: '#0a0e27', '&:hover': { bgcolor: '#f5c518' } }}
                    >
                      Копировать
                    </Button>
                    <Button 
                      variant="contained" 
                      startIcon={<BarChartIcon />}
                      onClick={() => navigate(`/stats/${link.shortCode}`)}
                    >
                      Статистика
                    </Button>
                    <Button 
                      variant="contained" 
                      startIcon={<DeleteIcon />}
                      onClick={() => handleDelete(link.shortCode)}
                      color="error"
                    >
                      Удалить
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>

          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={totalPages} 
                page={currentPage} 
                onChange={(e, page) => goToPage(page)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Container>
  );
}

export default Dashboard;