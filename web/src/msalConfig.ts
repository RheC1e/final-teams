import type { BrowserCacheLocation, Configuration } from '@azure/msal-browser'

const clientId = import.meta.env.VITE_AAD_CLIENT_ID
const tenantId = import.meta.env.VITE_AAD_TENANT_ID
const redirectUri = import.meta.env.VITE_AAD_REDIRECT_URI ?? window.location.origin
const knownAuthorities = import.meta.env.VITE_AAD_KNOWN_AUTHORITIES

if (!clientId) {
  console.warn('VITE_AAD_CLIENT_ID 未設定，MSAL 將無法正常運作。')
}

if (!tenantId) {
  console.warn('VITE_AAD_TENANT_ID 未設定，將使用 common 授權端點。')
}

export const msalConfig: Configuration = {
  auth: {
    clientId,
    authority: tenantId
      ? `https://login.microsoftonline.com/${tenantId}`
      : 'https://login.microsoftonline.com/common',
    redirectUri,
    knownAuthorities: knownAuthorities
      ? knownAuthorities
          .split(',')
          .map((entry: string) => entry.trim())
          .filter((entry: string): entry is string => entry.length > 0)
      : undefined,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: (import.meta.env.VITE_AAD_CACHE_LOCATION ?? 'localStorage') as BrowserCacheLocation,
    storeAuthStateInCookie: import.meta.env.VITE_AAD_STORE_AUTH_STATE_IN_COOKIE === 'true',
  },
  system: {},
}

export const baseLoginScopes =
  import.meta.env.VITE_AAD_DEFAULT_SCOPES?.split(',')
    .map((scope: string) => scope.trim())
    .filter((scope: string): scope is string => scope.length > 0) ?? ['User.Read']

