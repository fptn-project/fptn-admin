import React from 'react'
import './index.css'
import './i18n'
import App from './App'
import { BrowserRouter } from 'react-router-dom'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from './theme/ThemeProvider'

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
)
