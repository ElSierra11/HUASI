import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './components/Toast.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './styles/index.css'

// Initial theme check before mount
try {
  if (
    localStorage.getItem('theme') === 'dark' ||
    (!localStorage.getItem('theme') && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  }
} catch (e) {
  console.warn('Theme init warning:', e);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Clean up any legacy Service Worker registrations to purge invalid caches
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let reg of registrations) {
      reg.unregister();
    }
  }).catch(() => {});
}
