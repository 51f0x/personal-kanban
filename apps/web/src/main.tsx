import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initOfflineQueue } from './utils/offlineQueue';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

initOfflineQueue();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((error) => console.error('Service worker registration failed', error));
  });
}
