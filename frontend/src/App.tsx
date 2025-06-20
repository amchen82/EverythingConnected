import React, { useState } from 'react';
import WorkflowBuilder from './pages/WorkflowBuilder';
import Login from './pages/Login';

function App() {
  const [user, setUser] = useState<string | null>(null);

  return user ? (
    <WorkflowBuilder username={user} />
  ) : (
    <Login onLogin={(u) => setUser(u)} />
  );
}

export default App;
