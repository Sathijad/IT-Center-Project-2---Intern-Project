import { Configuration, PublicClientApplication } from '@azure/msal-browser';

const msalConfig: Configuration = {
  auth: {
    clientId: '31f88e34-0993-4c97-ab9a-a545bbe9f11b',
    authority: 'https://login.microsoftonline.com/c7886144-869f-423d-a018-9158602dc467',
    redirectUri: 'http://localhost:5173',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'Calendars.ReadWrite'],
};

export const msalInstance = new PublicClientApplication(msalConfig);


