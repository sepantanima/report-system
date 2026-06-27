import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/themedDatePicker.css'
import './index.css'
import App from './App.jsx'
import { applyDocumentTheme, readStoredThemeIsDark } from './context/ThemeContext.jsx'

applyDocumentTheme(readStoredThemeIsDark())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
