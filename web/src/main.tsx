import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { MsalProvider } from '@azure/msal-react'
import App from './App'
import './index.css'
import { msalInstance } from './lib/msalInstance'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MsalProvider instance={msalInstance}>
      <HashRouter>
        <App />
      </HashRouter>
    </MsalProvider>
  </StrictMode>,
)
