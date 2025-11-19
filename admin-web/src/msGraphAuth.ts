import { InteractionRequiredAuthError } from '@azure/msal-browser';
import { loginRequest, msalInstance } from './msalConfig';

let initializationPromise: Promise<void> | null = null;
const ensureMsalInitialized = () => {
  if (!initializationPromise) {
    initializationPromise = msalInstance.initialize();
  }
  return initializationPromise;
};

export async function getGraphAccessToken(): Promise<string> {
  await ensureMsalInitialized();

  let accounts = msalInstance.getAllAccounts();

  if (accounts.length === 0) {
    const loginResponse = await msalInstance.loginPopup(loginRequest);
    accounts = [loginResponse.account];
    return loginResponse.accessToken;
  }

  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({
      ...loginRequest,
      account: accounts[0],
    });
    return tokenResponse.accessToken;
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      const tokenResponse = await msalInstance.acquireTokenPopup({
        ...loginRequest,
        account: accounts[0],
      });
      return tokenResponse.accessToken;
    }
    throw error;
  }
}


