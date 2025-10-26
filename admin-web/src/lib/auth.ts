import { COGNITO } from './cognito';
import { randomString, pkceChallenge } from './pkce';

const KEY_VERIFIER = 'pkce_code_verifier';
const KEY_STATE = 'pkce_state';

export async function startLogin() {
  const verifier = randomString(64);
  const challenge = await pkceChallenge(verifier);
  const state = randomString(24);

  sessionStorage.setItem(KEY_VERIFIER, verifier);
  sessionStorage.setItem(KEY_STATE, state);

  const url = new URL(`${COGNITO.domain}/oauth2/authorize`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', COGNITO.clientId);
  url.searchParams.set('redirect_uri', COGNITO.redirectUri);
  url.searchParams.set('scope', COGNITO.scope);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('code_challenge', challenge);
  url.searchParams.set('state', state);

  window.location.assign(url.toString());
}

export function logout() {
  localStorage.removeItem('id_token');
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('expires_at');

  const url = new URL(`${COGNITO.domain}/logout`);
  url.searchParams.set('client_id', COGNITO.clientId);
  url.searchParams.set('logout_uri', COGNITO.logoutUri);
  window.location.assign(url.toString());
}

export const isAuthenticated = () => {
  return !!localStorage.getItem('access_token');
};
