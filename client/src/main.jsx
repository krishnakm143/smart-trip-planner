import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/eczar/latin-500.css'
import '@fontsource/eczar/latin-600.css'
import '@fontsource/hind/latin-400.css'
import '@fontsource/hind/latin-500.css'
import '@fontsource/hind/latin-600.css'
import './styles/tokens.css'
import './styles/base.css'
import App from './App'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
