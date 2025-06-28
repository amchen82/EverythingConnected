import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Stack
} from '@mui/material';
import IconButton from '@mui/material/IconButton';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

const Login = ({
  onLogin,
  mode,
  toggleMode
}: {
  onLogin: (username: string) => void,
  mode: 'light' | 'dark',
  toggleMode: () => void
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const send = async (mode: 'login' | 'signup') => {
    const payload = { username, password };
    const res = await fetch(`http://localhost:8000/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      localStorage.setItem('user', data.token); // Save user
      onLogin(data.token);
    } else {
      alert(data.detail || `❌ ${mode} failed`);
    }
  };

  return (
    <Box
      minHeight="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bgcolor={mode === 'dark' ? "#121212" : "#f7f7f7"}
      color={mode === 'dark' ? "white" : "black"}
    >
      <Paper elevation={3} sx={{ p: 4, minWidth: 320, bgcolor: mode === 'dark' ? "#1e1e1e" : "white" }}>
        <Typography variant="h5" mb={2} align="center">
          🔐 Login or Sign Up
        </Typography>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ style: { color: mode === 'dark' ? 'white' : 'black' } }}
            InputProps={{ style: { color: mode === 'dark' ? 'white' : 'black' } }}
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            fullWidth
            InputLabelProps={{ style: { color: mode === 'dark' ? 'white' : 'black' } }}
            InputProps={{ style: { color: mode === 'dark' ? 'white' : 'black' } }}
          />
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              color="primary"
              onClick={() => send('login')}
            >
              Login
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => send('signup')}
            >
              Sign Up
            </Button>
          </Stack>
        </Stack>
        <IconButton
          onClick={toggleMode}
          color="inherit"
          sx={{ position: 'absolute', top: 16, right: 16 }}
        >
          {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>
      </Paper>
    </Box>
  );
};



export default Login;
