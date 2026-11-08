import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { setCredentials } from '../store/authSlice';
import { clearLinks } from '../store/linksSlice';
import { register } from '../api';

import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    //  УДАЛЯЕМ СТАРЫЙ ТОКЕН
    localStorage.removeItem('token');
    
    if (password.length < 6) {
      toast.error('Пароль должен быть не менее 6 символов');
      return;
    }
    try {
      const data = await register(email, password);
      
      //  УДАЛЯЕМ СТАРЫЕ ССЫЛКИ ИЗ REDUX
      dispatch(clearLinks());
      
      dispatch(setCredentials({ user: data.user, token: data.token }));
      toast.success('Регистрация успешна!');
      navigate('/');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    }
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Card elevation={3}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" align="center" gutterBottom fontWeight="bold">
            Регистрация
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          <form onSubmit={handleSubmit}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <TextField
                fullWidth
                label="Пароль (мин. 6 символов)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Button type="submit" variant="contained" size="large" fullWidth color="secondary">
                Зарегистрироваться
              </Button>
            </Stack>
          </form>
          
          <Typography align="center" sx={{ mt: 3 }}>
            Уже есть аккаунт?{' '}
            <Link to="/login" style={{ fontWeight: 'bold', textDecoration: 'none' }}>
              Войти
            </Link>
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}

export default Register;