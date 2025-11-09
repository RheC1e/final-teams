import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMsal } from '@azure/msal-react'
import * as teamsJs from '@microsoft/teams-js'
import { baseLoginScopes } from '../msalConfig'
import { ensureMsalInitialized, msalInstance } from '../lib/msalInstance'
import { useTeamsEnvironment, type LoginScenario } from '../hooks/useTeamsEnvironment'

type AuthStatus = 'idle' | 'pending' | 'succeeded' | 'failed'

interface AuthSuccessMessage {
  type: 'msal:login-success'
  homeAccountId: string
  scenario?: LoginScenario
}

interface AuthFailureMessage {
  type: 'msal:login-failure'
  message: string
}

type IncomingAuthMessage = AuthSuccessMessage | AuthFailureMessage

const scenarioLabels: Record<LoginScenario, string> = {
  desktop: '桌面版 Teams',
  'chrome-teams': 'Chrome Teams',
  'safari-teams': 'Safari Teams',
  'chrome-web': 'Chrome 直連網頁',
  'safari-web': 'Safari 直連網頁',
  'edge-web': 'Edge 直連網頁',
  other: '其他環境',
}

const graphMeEndpoint = 'https://graph.microsoft.com/v1.0/me'

const defaultProfile = {
  displayName: '',
  userPrincipalName: '',
  id: '',
  givenName: '',
  surname: '',
}

export const HomePage = () => {
  const environment = useTeamsEnvironment()
  const { instance, accounts } = useMsal()

  const [authStatus, setAuthStatus] = useState<AuthStatus>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [profile, setProfile] = useState<typeof defaultProfile | null>(null)

  const scenarioLabel = useMemo(
    () => scenarioLabels[environment.scenario] ?? scenarioLabels.other,
    [environment.scenario],
  )

  const syncAccountAndProfile = useCallback(
    async (homeAccountId?: string) => {
      setErrorMessage(null)
      setAuthStatus('pending')
       setProfile(null)
      await ensureMsalInitialized()

      const activeAccount =
        (homeAccountId
          ? msalInstance.getAllAccounts().find((acc) => acc.homeAccountId === homeAccountId)
          : msalInstance.getActiveAccount()) ?? msalInstance.getAllAccounts()[0]

      if (!activeAccount) {
        setAuthStatus('failed')
        setErrorMessage('尚未取得登入帳號資訊，請重新登入。')
        return
      }

      instance.setActiveAccount(activeAccount)

      try {
        const tokenResponse = await instance.acquireTokenSilent({
          scopes: baseLoginScopes,
          account: activeAccount,
        })

        const graphResponse = await fetch(graphMeEndpoint, {
          headers: {
            Authorization: `Bearer ${tokenResponse.accessToken}`,
          },
        })

        if (!graphResponse.ok) {
          throw new Error(`Graph API 回應錯誤：${graphResponse.status}`)
        }

        const graphData = await graphResponse.json()

        setProfile({
          displayName: graphData.displayName,
          userPrincipalName: graphData.userPrincipalName,
          id: graphData.id,
          givenName: graphData.givenName,
          surname: graphData.surname,
        })
        setAuthStatus('succeeded')
      } catch (error) {
        console.error(error)
        const message =
          error instanceof Error ? error.message : '取得 Microsoft Graph 資料失敗，請稍後再試。'
        setAuthStatus('failed')
        setErrorMessage(message)
      }
    },
    [instance],
  )

  useEffect(() => {
    void ensureMsalInitialized().then(() => {
      if (accounts.length > 0 && authStatus === 'idle' && !profile) {
        void syncAccountAndProfile()
      }
    })
  }, [accounts, authStatus, profile, syncAccountAndProfile])

  useEffect(() => {
    const messageHandler = (event: MessageEvent<IncomingAuthMessage>) => {
      if (event.origin !== window.location.origin) {
        return
      }

      if (!event.data || !('type' in event.data)) {
        return
      }

      if (event.data.type === 'msal:login-success') {
        void syncAccountAndProfile(event.data.homeAccountId)
      } else if (event.data.type === 'msal:login-failure') {
        setAuthStatus('failed')
        setErrorMessage(event.data.message || '登入失敗，請重新嘗試。')
      }
    }

    window.addEventListener('message', messageHandler)
    return () => window.removeEventListener('message', messageHandler)
  }, [syncAccountAndProfile])

  const processTeamsPopupResult = useCallback(
    async (result: string) => {
      try {
        const payload: AuthSuccessMessage = JSON.parse(result)
        await syncAccountAndProfile(payload.homeAccountId)
      } catch (error) {
        console.error(error)
        setAuthStatus('failed')
        setErrorMessage('解析 Teams 回傳的登入結果失敗。')
      }
    },
    [syncAccountAndProfile],
  )

  const handleLogin = useCallback(() => {
    if (!environment.ready) {
      setErrorMessage('環境尚未初始化完成，請稍後再試。')
      return
    }

    setAuthStatus('pending')
    setErrorMessage(null)

    const params = new URLSearchParams({
      source: environment.inTeams ? 'teams' : 'web',
      scenario: environment.scenario,
    })
    if (environment.loginHint) {
      params.set('loginHint', environment.loginHint)
    }

    const authUrl = `${window.location.origin}/#/auth?${params.toString()}`

    if (environment.scenario === 'desktop') {
      teamsJs.authentication.authenticate({
        url: authUrl,
        width: 600,
        height: 535,
        successCallback: (result: string) => {
          void processTeamsPopupResult(result)
        },
        failureCallback: (reason: string | Error) => {
          console.error(reason)
          setAuthStatus('failed')
          setErrorMessage(
            typeof reason === 'string' ? reason : 'Teams 桌面版登入流程遭拒絕或失敗。',
          )
        },
      })
      return
    }

    const newTab = window.open(authUrl, '_blank')
    if (!newTab) {
      setAuthStatus('failed')
      setErrorMessage('瀏覽器阻擋了新分頁，請允許本網站開啟新分頁後再試一次。')
    }
  }, [environment, processTeamsPopupResult])

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>Final Teams 自動登入示範</h1>
        <p className="scenario">目前檢測環境：{scenarioLabel}</p>
      </header>

      <main className="app-main">
        <section className="auth-card">
          <p>按下登入後，會自動帶入目前的 Microsoft 365 / Teams 帳號進行授權。</p>
          <button
            className="login-button"
            onClick={handleLogin}
            disabled={authStatus === 'pending' || !environment.ready}
          >
            {authStatus === 'pending' ? '登入中…' : '使用 Teams 帳號登入'}
          </button>

          {errorMessage && <p className="error-message">⚠️ {errorMessage}</p>}

          {profile && authStatus === 'succeeded' && (
            <div className="profile">
              <h2>登入資訊</h2>
              <ul>
                <li>
                  <strong>顯示名稱：</strong>
                  <span>{profile.displayName}</span>
                </li>
                <li>
                  <strong>帳號：</strong>
                  <span>{profile.userPrincipalName}</span>
                </li>
                <li>
                  <strong>名字／姓氏：</strong>
                  <span>
                    {profile.givenName} {profile.surname}
                  </span>
                </li>
                <li>
                  <strong>使用者 ID：</strong>
                  <span>{profile.id}</span>
                </li>
              </ul>
            </div>
          )}
        </section>

        <section className="notes">
          <h3>登入規則摘要</h3>
          <ul>
            <li>桌面版 Teams：以彈出視窗顯示授權流程。</li>
            <li>Chrome / Safari Teams：開啟新分頁進入授權頁。</li>
            <li>Chrome / Safari 直連網頁：同樣以新分頁登入。</li>
            <li>其他環境：採用新分頁登入，必要時提示手動允許彈出視窗。</li>
          </ul>
        </section>
      </main>
    </div>
  )
}

