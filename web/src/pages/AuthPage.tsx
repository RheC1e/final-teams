import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import * as teamsJs from '@microsoft/teams-js'
import { baseLoginScopes } from '../msalConfig'
import { ensureMsalInitialized, msalInstance } from '../lib/msalInstance'
import type { AuthError } from '@azure/msal-browser'

type AuthPhase = 'preparing' | 'redirecting' | 'processing' | 'succeeded' | 'failed'

const successMessage = (homeAccountId: string, scenario?: string) => ({
  type: 'msal:login-success' as const,
  homeAccountId,
  scenario,
})

const failureMessage = (message: string) => ({
  type: 'msal:login-failure' as const,
  message,
})

const notifyTeams = async (payload: unknown, isError = false) => {
  try {
    await teamsJs.app.initialize()
    if (isError) {
      teamsJs.authentication.notifyFailure(typeof payload === 'string' ? payload : JSON.stringify(payload))
    } else {
      teamsJs.authentication.notifySuccess(
        typeof payload === 'string' ? payload : JSON.stringify(payload),
      )
    }
    return true
  } catch (error) {
    console.warn('Teams 通知失敗，改用 postMessage。', error)
    return false
  }
}

const postMessageToOpener = (payload: unknown) => {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(payload, window.location.origin)
  }
}

const parseSearch = (search: string) => {
  const query = new URLSearchParams(search)
  const source = query.get('source') ?? 'web'
  const loginHint = query.get('loginHint') ?? undefined
  const scenario = query.get('scenario') ?? undefined
  return { source, loginHint, scenario }
}

export const AuthPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { source, loginHint, scenario } = useMemo(() => parseSearch(location.search), [location.search])
  const [phase, setPhase] = useState<AuthPhase>('preparing')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const triggerLogin = async () => {
      setPhase('redirecting')
      await msalInstance.loginRedirect({
        scopes: baseLoginScopes,
        loginHint,
        redirectStartPage: window.location.href,
      })
    }

    const run = async () => {
      try {
        setPhase('processing')
        await ensureMsalInitialized()

        const redirectResult = await msalInstance.handleRedirectPromise()
        let account = redirectResult?.account

        if (!account) {
          account = msalInstance.getActiveAccount() ?? msalInstance.getAllAccounts()[0]
        }

        if (!account) {
          await triggerLogin()
          return
        }

        msalInstance.setActiveAccount(account)
        setPhase('succeeded')

        const payload = successMessage(account.homeAccountId, scenario)
        const notified = source === 'teams' ? await notifyTeams(payload) : false
        if (!notified) {
          postMessageToOpener(payload)
        }

        if (source !== 'teams') {
          window.close()
        }
      } catch (err) {
        console.error(err)
        const errorCode = (err as AuthError | undefined)?.errorCode

        if (errorCode === 'no_token_request_cache_error' || errorCode === 'no_account_in_silent_request') {
          await triggerLogin()
          return
        }

        const message =
          err instanceof Error ? err.message : '登入流程發生未預期錯誤，請關閉視窗後重新登入。'
        setError(message)
        setPhase('failed')

        const payload = failureMessage(message)
        const notified = source === 'teams' ? await notifyTeams(payload, true) : false
        if (!notified) {
          postMessageToOpener(payload)
        }
      }
    }

    void run()
  }, [loginHint, scenario, source])

  const goHome = () => {
    navigate('/', { replace: true })
  }

  return (
    <div className="auth-screen">
      <div className="auth-panel">
        <h1>Microsoft 365 授權登入</h1>
        {phase === 'preparing' && <p>正在準備授權程序…</p>}
        {phase === 'redirecting' && <p>即將前往 Microsoft 登入頁面，請稍候。</p>}
        {phase === 'processing' && <p>授權完成後即會自動關閉此頁面，請勿關閉視窗。</p>}
        {phase === 'succeeded' && <p>登入成功，視窗將自動關閉或返回原頁面。</p>}
        {phase === 'failed' && (
          <>
            <p className="error-message">登入失敗：{error}</p>
            <button onClick={goHome}>返回首頁</button>
          </>
        )}
      </div>
    </div>
  )
}

