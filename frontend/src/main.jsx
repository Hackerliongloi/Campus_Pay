import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Intercept fetch calls to dynamically point to production API when deployed
const originalFetch = window.fetch;
window.fetch = function (input, init) {
  if (typeof input === 'string' && (input.startsWith('/api/') || input.startsWith('/uploads/'))) {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    input = `${baseUrl}${input}`;
  }
  return originalFetch(input, init);
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
