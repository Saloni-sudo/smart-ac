// client/src/App.jsx
import { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('loading...');

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;   // localhost on your Mac, Render URL when deployed
    fetch(`${apiUrl}/api/hello`)
      .then((res) => res.json())
      .then((data) => setMessage(data.message))
      .catch(() => setMessage('could not reach the server'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Smart AC — coming soon</h1>
      <p>Server says: {message}</p>
    </div>
  );
}

export default App;