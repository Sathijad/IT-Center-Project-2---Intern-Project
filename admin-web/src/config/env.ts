export const config = {
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  COGNITO_USER_POOL_ID: 'ap-southeast-2_hTAYJId8y',
  COGNITO_CLIENT_ID: '3rdnl5ind8guti89jrbob85r4i',
  COGNITO_DOMAIN: 'itcenter-auth.auth.ap-southeast-2.amazoncognito.com',
  COGNITO_REGION: 'ap-southeast-2',
  OAUTH_REDIRECT_URI: 'http://localhost:5173/auth/callback',
  OAUTH_LOGOUT_REDIRECT_URI: 'http://localhost:5173',
}

export const cognitoConfig = {
  Auth: {
    region: config.COGNITO_REGION,
    userPoolId: config.COGNITO_USER_POOL_ID,
    userPoolWebClientId: config.COGNITO_CLIENT_ID,
    oauth: {
      domain: config.COGNITO_DOMAIN,
      scope: ['openid', 'profile', 'email'],
      redirectSignIn: config.OAUTH_REDIRECT_URI,
      redirectSignOut: config.OAUTH_LOGOUT_REDIRECT_URI,
      responseType: 'code',
    },
  },
}

