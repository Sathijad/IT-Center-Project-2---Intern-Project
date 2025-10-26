// Cognito OIDC helper functions
import { config } from '../config/env'

export const getCognitoAuthUrl = () => {
  const { COGNITO_DOMAIN, OAUTH_REDIRECT_URI, COGNITO_CLIENT_ID } = config
  
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    response_type: 'code',
    scope: 'openid profile email',
    redirect_uri: OAUTH_REDIRECT_URI,
    state: generateState(),
  })
  
  return `https://${COGNITO_DOMAIN}/oauth2/authorize?${params.toString()}`
}

export const exchangeCodeForTokens = async (code: string, state: string) => {
  // Verify state to prevent CSRF
  const savedState = localStorage.getItem('oauth_state')
  if (state !== savedState) {
    throw new Error('Invalid state parameter')
  }
  
  const { COGNITO_DOMAIN, COGNITO_CLIENT_ID, OAUTH_REDIRECT_URI } = config
  
  const response = await fetch(`https://${COGNITO_DOMAIN}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: COGNITO_CLIENT_ID,
      code,
      redirect_uri: OAUTH_REDIRECT_URI,
    }),
  })
  
  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens')
  }
  
  const data = await response.json()
  localStorage.setItem('access_token', data.access_token)
  localStorage.setItem('id_token', data.id_token)
  
  return data
}

export const logout = () => {
  localStorage.removeItem('access_token')
  localStorage.removeItem('id_token')
  localStorage.removeItem('user')
  localStorage.removeItem('oauth_state')
  
  const { COGNITO_DOMAIN, OAUTH_LOGOUT_REDIRECT_URI, COGNITO_CLIENT_ID } = config
  const params = new URLSearchParams({
    client_id: COGNITO_CLIENT_ID,
    logout_uri: OAUTH_LOGOUT_REDIRECT_URI,
  })
  
  window.location.href = `https://${COGNITO_DOMAIN}/logout?${params.toString()}`
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token')
}

function generateState() {
  const state = Math.random().toString(36).substring(2, 15)
  localStorage.setItem('oauth_state', state)
  return state
}
