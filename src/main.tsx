// Suppress external browser extension errors (e.g., Urban VPN extension attempting to overwrite fetch)
if (typeof window !== 'undefined') {
  const isExtensionError = (msg?: string | null, src?: string | null) => {
    return (
      (typeof src === 'string' && src.includes('chrome-extension://')) ||
      (typeof msg === 'string' && msg.includes('Cannot set property fetch'))
    );
  };

  window.addEventListener('error', (event) => {
    if (
      isExtensionError(event.message, event.filename) ||
      (event.error && isExtensionError(event.error.message, event.filename))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

// Ensure window.fetch is writable for test runners, executors, and browser extensions
(function setupFetchInterceptor() {
  try {
    if (typeof window !== 'undefined') {
      const origFetch = window.fetch ? window.fetch.bind(window) : undefined;
      if (origFetch) {
        try {
          Object.defineProperty(window, 'fetch', {
            value: origFetch,
            writable: true,
            configurable: true,
            enumerable: true,
          });
        } catch {
          try {
            let currentFetch = origFetch;
            Object.defineProperty(window, 'fetch', {
              get: () => currentFetch,
              set: (val: any) => { currentFetch = val; },
              configurable: true,
              enumerable: true,
            });
          } catch {}
        }

        if (typeof Window !== 'undefined' && Window.prototype) {
          try {
            Object.defineProperty(Window.prototype, 'fetch', {
              value: origFetch,
              writable: true,
              configurable: true,
              enumerable: true,
            });
          } catch {
            try {
              let protoFetch = origFetch;
              Object.defineProperty(Window.prototype, 'fetch', {
                get: () => protoFetch,
                set: (val: any) => { protoFetch = val; },
                configurable: true,
                enumerable: true,
              });
            } catch {}
          }
        }
      }
    }
  } catch (err) {
    console.warn('Fetch setter patch notice:', err);
  }
})();

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
