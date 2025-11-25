const rawApiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL
const rawLeaveApiBaseUrl = (import.meta as any).env.VITE_LEAVE_API_BASE_URL
const rawBookingApiBaseUrl = (import.meta as any).env.VITE_BOOKING_API_BASE_URL
const rawSchedulesApiBaseUrl = (import.meta as any).env.VITE_SCHEDULES_API_BASE_URL
const useLocalPhase2 = String((import.meta as any).env.VITE_USE_LOCAL_PHASE2 || '').toLowerCase() === 'true'

const defaultLeaveApiBaseUrl = 'https://xfub6mzcqg.execute-api.ap-southeast-2.amazonaws.com'
const defaultBookingApiBaseUrl = 'https://7kzqtue6ac.execute-api.ap-southeast-2.amazonaws.com'

const apiBaseUrl = rawApiBaseUrl || 'http://localhost:8080'
const leaveApiBaseUrl = rawLeaveApiBaseUrl || (useLocalPhase2 ? 'http://localhost:3000' : defaultLeaveApiBaseUrl)
const bookingApiBaseUrl = rawBookingApiBaseUrl || defaultBookingApiBaseUrl
const schedulesApiBaseUrl = rawSchedulesApiBaseUrl || 'http://localhost:5166'

export const config = {
  // Phase 1 Backend (Spring Boot) - Auth, Users, Audit
  API_BASE_URL: apiBaseUrl,
  // Phase 2 Backend (AWS Lambda) - Leave, Attendance
  LEAVE_API_BASE_URL: leaveApiBaseUrl,
  // Phase 3 Backend (AWS Lambda) - Booking
  BOOKING_API_BASE_URL: bookingApiBaseUrl,
  // Phase 4 Backend (ASP.NET Core) - Schedules, Tasks
  SCHEDULES_API_BASE_URL: schedulesApiBaseUrl,
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

