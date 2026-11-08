import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../store/authSlice';
import { clearLinks } from '../store/linksSlice';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import LinkIcon from '@mui/icons-material/Link';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';

function Navbar({ isDark, setIsDark }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);

  const handleLogout = () => {
    dispatch(clearLinks());
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar 
      position="static" 
      elevation={0}
      sx={{ 
        background: isDark 
          ? 'linear-gradient(90deg, #0a0e27 0%, #1a1f3a 50%, #2d1b4e 100%)' 
          : 'linear-gradient(90deg, #ffffff 0%, #f5f7ff 50%, #e8eaf6 100%)',
        borderBottom: isDark ? '1px solid rgba(255, 215, 0, 0.2)' : '1px solid rgba(26, 31, 58, 0.1)',
      }}
    >
      <Toolbar>
        <LinkIcon sx={{ mr: 1, fontSize: 28, color: isDark ? '#ffd700' : '#1a1f3a' }} />
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 'bold',
            color: isDark ? '#ffffff' : '#0a0e27',
          }}
        >
          <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            URL Shortener
          </Link>
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Button color="inherit" component={Link} to="/" sx={{ color: isDark ? '#ffffff' : '#0a0e27' }}>
            Главная
          </Button>
          {isAuthenticated ? (
            <>
              <Button color="inherit" component={Link} to="/dashboard" sx={{ color: isDark ? '#ffffff' : '#0a0e27' }}>
                Мои ссылки
              </Button>
              <Button variant="outlined" onClick={handleLogout} sx={{ borderColor: isDark ? '#ffd700' : '#1a1f3a', color: isDark ? '#ffd700' : '#1a1f3a' }}>
                Выйти
              </Button>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login" sx={{ color: isDark ? '#ffffff' : '#0a0e27' }}>
                Войти
              </Button>
              <Button variant="contained" component={Link} to="/register" sx={{ bgcolor: '#ffd700', color: '#0a0e27', '&:hover': { bgcolor: '#f5c518' } }}>
                Регистрация
              </Button>
            </>
          )}
          
          {/* Переключатель темы */}
          <IconButton 
            onClick={() => setIsDark(!isDark)} 
            sx={{ ml: 1, color: isDark ? '#ffd700' : '#1a1f3a' }}
            title={isDark ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {isDark ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default Navbar;