import { createTheme } from '@mui/material/styles';

// 🌙 ТЁМНАЯ ТЕМА (как на картинке)
export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#ffd700', // Жёлтый акцент
    },
    secondary: {
      main: '#9c27b0', // Фиолетовый
    },
    background: {
      default: '#0a0e27', // Очень тёмный синий
      paper: '#1a1f3a',   // Чуть светлее для карточек
    },
    text: {
      primary: '#ffffff',
      secondary: '#b0b8d1',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, #1a1f3a 0%, #0f1429 100%)',
          border: '1px solid rgba(255, 215, 0, 0.1)',
        },
      },
    },
  },
});

// ☀️ СВЕТЛАЯ ТЕМА (инверсия)
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1a1f3a', // Тёмно-синий акцент
    },
    secondary: {
      main: '#9c27b0', // Фиолетовый
    },
    background: {
      default: '#f5f7ff', // Светлый с синим оттенком
      paper: '#ffffff',
    },
    text: {
      primary: '#0a0e27',
      secondary: '#5a6280',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(145deg, #ffffff 0%, #f5f7ff 100%)',
          border: '1px solid rgba(26, 31, 58, 0.1)',
        },
      },
    },
  },
});