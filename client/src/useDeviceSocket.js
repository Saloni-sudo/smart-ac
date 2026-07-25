// client/src/useDeviceSocket.js
// Owns the raw socket.io connection so App.jsx doesn't have to. Subscribes to the
// backend `reading` event and exposes: the latest reading, a rolling in-memory
// history (last 60 readings), a connection status, and a sendCommand helper.
// All time reasoning downstream uses reading.timestamp — this hook never looks at
// the wall clock.
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const HISTORY_LIMIT = 60;   // keep only the last 60 readings — a rolling window, no history store

export function useDeviceSocket() {
  const [latest, setLatest] = useState(null);        // most recent Reading, or null before any arrive
  const [history, setHistory] = useState([]);        // rolling window of recent Readings
  const [status, setStatus] = useState('connecting'); // 'connecting' | 'connected' | 'disconnected'
  const socketRef = useRef(null);

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL;     // same env var the rest of the app uses
    const socket = io(apiUrl);                        // auto-reconnects by default
    socketRef.current = socket;

    socket.on('connect', () => setStatus('connected'));
    socket.on('disconnect', () => setStatus('disconnected'));
    socket.io.on('reconnect_attempt', () => setStatus('connecting')); // trying to come back

    socket.on('reading', (reading) => {
      setLatest(reading);
      setHistory((prev) => {
        const next = prev.concat(reading);            // append the real reading, unmodified
        return next.length > HISTORY_LIMIT
          ? next.slice(next.length - HISTORY_LIMIT)    // drop the oldest to keep the window size
          : next;
      });
    });

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, []);

  // Send a full declarative Command. Only emits while connected — a command can't
  // be delivered otherwise, and callers also disable the controls when disconnected.
  const sendCommand = useCallback((command) => {
    const socket = socketRef.current;
    if (socket && socket.connected) socket.emit('command', command);
  }, []);

  return { latest, history, status, sendCommand };
}
