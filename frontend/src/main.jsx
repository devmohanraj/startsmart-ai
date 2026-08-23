import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
    <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', boxShadow: '0 2px 4px -1px rgba(0,0,0,0.1)' } }} />
  </StrictMode>,
)
