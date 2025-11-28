import { jsx as _jsx } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { initOfflineQueue } from './utils/offlineQueue';
const root = document.getElementById('root');
if (!root) {
    throw new Error('Root element not found');
}
ReactDOM.createRoot(root).render(_jsx(React.StrictMode, { children: _jsx(App, {}) }));
initOfflineQueue();
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/sw.js')
            .catch((error) => console.error('Service worker registration failed', error));
    });
}
//# sourceMappingURL=main.js.map