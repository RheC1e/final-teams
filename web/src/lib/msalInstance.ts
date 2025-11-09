import { PublicClientApplication } from '@azure/msal-browser'
import { msalConfig } from '../msalConfig'

export const msalInstance = new PublicClientApplication(msalConfig)

export const ensureMsalInitialized = async () => {
  await msalInstance.initialize()
  const accounts = msalInstance.getAllAccounts()
  if (accounts.length > 0) {
    msalInstance.setActiveAccount(accounts[0])
  }
}

if (typeof window !== 'undefined') {
  ;(window as Window & typeof globalThis & { __msalInstance?: typeof msalInstance; __msalConfig?: typeof msalConfig }).__msalInstance =
    msalInstance
  ;(window as Window & typeof globalThis & { __msalConfig?: typeof msalConfig }).__msalConfig = msalConfig
}

