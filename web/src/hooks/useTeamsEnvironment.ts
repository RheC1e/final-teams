import { useEffect, useMemo, useState } from 'react'
import * as teamsJs from '@microsoft/teams-js'

type TeamsContext = Awaited<ReturnType<typeof teamsJs.app.getContext>>

export type LoginScenario =
  | 'desktop'
  | 'chrome-teams'
  | 'safari-teams'
  | 'chrome-web'
  | 'safari-web'
  | 'edge-web'
  | 'other'

export interface TeamsEnvironmentState {
  ready: boolean
  inTeams: boolean
  scenario: LoginScenario
  loginHint?: string
  context?: TeamsContext
  error?: Error
}

const detectBrowser = () => {
  const userAgent = window.navigator.userAgent.toLowerCase()
  if (userAgent.includes('edg/')) {
    return 'edge'
  }
  if (userAgent.includes('chrome') && !userAgent.includes('edg/')) {
    return 'chrome'
  }
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari'
  }
  return 'other'
}

const mapScenario = (inTeams: boolean, clientType?: string, browser?: string): LoginScenario => {
  if (inTeams) {
    if (clientType === 'desktop') {
      return 'desktop'
    }
    if (browser === 'safari') {
      return 'safari-teams'
    }
    if (browser === 'chrome') {
      return 'chrome-teams'
    }
    return 'other'
  }

  if (browser === 'chrome') {
    return 'chrome-web'
  }
  if (browser === 'safari') {
    return 'safari-web'
  }
  if (browser === 'edge') {
    return 'edge-web'
  }
  return 'other'
}

export const useTeamsEnvironment = (): TeamsEnvironmentState => {
  const [state, setState] = useState<TeamsEnvironmentState>({
    ready: false,
    inTeams: false,
    scenario: 'other',
  })

  useEffect(() => {
    let disposed = false

    const init = async () => {
      const browser = detectBrowser()
      try {
        await teamsJs.app.initialize()
        const ctx = await teamsJs.app.getContext()

        if (disposed) {
          return
        }

        const clientType = ctx?.app?.host?.clientType

        setState({
          ready: true,
          inTeams: true,
          scenario: mapScenario(true, clientType, browser),
          loginHint: ctx.user?.loginHint ?? ctx.user?.userPrincipalName,
          context: ctx,
        })
      } catch (error) {
        if (disposed) {
          return
        }

        setState({
          ready: true,
          inTeams: false,
          scenario: mapScenario(false, undefined, browser),
          error: error instanceof Error ? error : new Error('initialize teams failed'),
        })
      }
    }

    void init()

    return () => {
      disposed = true
    }
  }, [])

  return useMemo(() => state, [state])
}

