const debugEnv = () => {
  const env = {
    clientId: import.meta.env.VITE_AAD_CLIENT_ID,
    tenantId: import.meta.env.VITE_AAD_TENANT_ID,
    redirectUri: import.meta.env.VITE_AAD_REDIRECT_URI,
    defaultScopes: import.meta.env.VITE_AAD_DEFAULT_SCOPES,
  }
  console.info('[debugEnv]', env)
  return env
}

export default debugEnv
