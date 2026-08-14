import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { App } from '@/app/App'

import './styles/globals.css'

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element #root was not found in index.html.')
}

/*
 * The boot shell painted by index.html (PRD 39) lives inside #root, so
 * createRoot replaces it on the first render. Nothing to clear manually.
 */
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
