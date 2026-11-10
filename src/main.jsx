import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// Tema guardado en este navegador (oscuro por defecto).
try {
  document.documentElement.dataset.theme = localStorage.getItem('stoa-theme') || 'dark'
} catch {
  document.documentElement.dataset.theme = 'dark'
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
