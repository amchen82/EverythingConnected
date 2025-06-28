import React, { useState, useMemo, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, IconButton, Button } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Login from './pages/Login';

const App = () => {
  const [user, setUser] = useState<string | null>(null);
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  // Auto-login if user is in localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(savedUser);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div style={{ position: 'absolute', top: 16, right: 16 }}>
        <IconButton onClick={() => setMode(mode === 'light' ? 'dark' : 'light')} color="inherit">
          {mode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
        </IconButton>
      </div>
      {user ? (
        <>
          <WorkflowBuilder username={user} mode={mode} />
          <Button onClick={() => { localStorage.removeItem('user'); setUser(null); }}>
            Logout
          </Button>
        </>
      ) : (
        <Login
          onLogin={u => {
            localStorage.setItem('user', u);
            setUser(u);
          }}
          mode={mode}
          toggleMode={() => setMode(mode === 'light' ? 'dark' : 'light')}
        />
      )}
    </ThemeProvider>
  );
};

export default App;
