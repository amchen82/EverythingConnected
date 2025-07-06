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
    const savedUser = sessionStorage.getItem('user');
    if (savedUser) setUser(savedUser);
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      
      {user ? (
        <div>
          {/* Fixed-position Logout button in upper right */}
          <Button
            variant="outlined"
            color="error"
            onClick={() => { sessionStorage.removeItem('user'); setUser(null); }}
            sx={{
              position: 'fixed',
              top: 16,
              right: 200,
              zIndex: 2000
            }}
          >
            Logout
          </Button>
          <WorkflowBuilder username={user} mode={mode} setMode={setMode} />
        </div>
      ) : (
        <Login
          onLogin={u => {
            sessionStorage.setItem('user', u);
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
