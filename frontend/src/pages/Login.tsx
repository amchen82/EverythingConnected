import React, { useState } from 'react';

const Login = ({ onLogin }: { onLogin: (username: string) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const send = async (mode: 'login' | 'signup') => {
    const payload = { username, password };
  console.log(`🔍 Sending to /${mode}:`, payload);  
    const res = await fetch(`http://localhost:8000/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    if (res.ok) {
      onLogin(data.token);
    } else {
      alert(data.detail || `❌ ${mode} failed`);
    }
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>🔐 Login or Sign Up</h2>
      <input
        type="email"
        placeholder="Email"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
      /><br />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
      /><br />
      <button onClick={() => send('login')}>Login</button>
      <button onClick={() => send('signup')}>Sign Up</button>
    </div>
  );
};

export default Login;
