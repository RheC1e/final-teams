import type { BrowserCacheLocation, Configuration } from '@azure/msal-browser'

const sanitize = (value?: string) => value?.trim() || undefined

const clientId = sanitize(import.meta.env.VITE_AAD_CLIENT_ID) ?? ''
const tenantId = sanitize(import.meta.env.VITE_AAD_TENANT_ID)
const redirectUri = sanitize(import.meta.env.VITE_AAD_REDIRECT_URI) ?? window.location.origin
const knownAuthorities = sanitize(import.meta.env.VITE_AAD_KNOWN_AUTHORITIES)

const buildAuthorityMetadata = (tenant: string) =>
  JSON.stringify({
    token_endpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    token_endpoint_auth_methods_supported: [
      'client_secret_post',
      'private_key_jwt',
      'client_secret_basic',
      'self_signed_tls_client_auth',
    ],
    jwks_uri: `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`,
    response_modes_supported: ['query', 'fragment', 'form_post'],
    subject_types_supported: ['pairwise'],
    id_token_signing_alg_values_supported: ['RS256'],
    response_types_supported: ['code', 'id_token', 'code id_token', 'id_token token'],
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    request_uri_parameter_supported: false,
    userinfo_endpoint: 'https://graph.microsoft.com/oidc/userinfo',
    authorization_endpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    device_authorization_endpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/devicecode`,
    http_logout_supported: true,
    frontchannel_logout_supported: true,
    end_session_endpoint: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/logout`,
    claims_supported: [
      'sub',
      'iss',
      'cloud_instance_name',
      'cloud_instance_host_name',
      'cloud_graph_host_name',
      'msgraph_host',
      'aud',
      'exp',
      'iat',
      'auth_time',
      'acr',
      'nonce',
      'preferred_username',
      'name',
      'tid',
      'ver',
      'at_hash',
      'c_hash',
      'email',
    ],
    kerberos_endpoint: `https://login.microsoftonline.com/${tenant}/kerberos`,
    mtls_endpoint_aliases: {
      token_endpoint: `https://mtlsauth.microsoft.com/${tenant}/oauth2/v2.0/token`,
    },
    tls_client_certificate_bound_access_tokens: true,
    tenant_region_scope: 'AS',
    cloud_instance_name: 'microsoftonline.com',
    cloud_graph_host_name: 'graph.windows.net',
    msgraph_host: 'graph.microsoft.com',
    rbac_url: 'https://pas.windows.net',
  })

const authorityMetadata = tenantId ? buildAuthorityMetadata(tenantId) : undefined

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
      ? `https://login.microsoftonline.com/${tenantId}/`
      : 'https://login.microsoftonline.com/common',
    redirectUri,
    authorityMetadata,
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

