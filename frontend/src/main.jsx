import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AlertProvider } from './context/AlertContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AlertProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </AlertProvider>
  </StrictMode>,
)
