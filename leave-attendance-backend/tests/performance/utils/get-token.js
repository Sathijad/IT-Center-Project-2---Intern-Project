/**
 * Helper script to get JWT token from AWS Cognito
 * 
 * Usage:
 *   node get-token.js <username> <password>
 * 
 * Or set environment variables:
 *   COGNITO_CLIENT_ID=your-client-id
 *   COGNITO_USER_POOL_ID=your-pool-id
 *   COGNITO_REGION=ap-southeast-2
 *   COGNITO_USERNAME=your-username
 *   COGNITO_PASSWORD=your-password
 * 
 * This script uses AWS SDK to authenticate and get tokens.
 * Make sure AWS credentials are configured or set AWS_PROFILE.
 * 
 * Install dependencies first:
 *   cd utils && npm install
 */

import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';

const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID || '3rdnl5ind8guti89jrbob85r4i';
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID || 'ap-southeast-2_hTAYJId8y';
const COGNITO_REGION = process.env.COGNITO_REGION || 'ap-southeast-2';
const COGNITO_USERNAME = process.env.COGNITO_USERNAME || (process.argv.length > 2 ? process.argv[2] : null);
const COGNITO_PASSWORD = process.env.COGNITO_PASSWORD || (process.argv.length > 3 ? process.argv[3] : null);

if (!COGNITO_USERNAME || !COGNITO_PASSWORD) {
  console.error('❌ Error: Username and password required');
  console.error('\nUsage:');
  console.error('  node utils/get-token.js <username> <password>');
  console.error('\nOr set environment variables:');
  console.error('  COGNITO_USERNAME=user@example.com');
  console.error('  COGNITO_PASSWORD=your-password');
  process.exit(1);
}

async function getToken() {
  const client = new CognitoIdentityProviderClient({ region: COGNITO_REGION });

  try {
    const command = new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: COGNITO_USERNAME,
        PASSWORD: COGNITO_PASSWORD,
      },
    });

    const response = await client.send(command);

    if (response.AuthenticationResult) {
      const accessToken = response.AuthenticationResult.AccessToken;
      const idToken = response.AuthenticationResult.IdToken;
      
      console.log('\n✅ Authentication successful!\n');
      console.log('Access Token:');
      console.log(accessToken);
      console.log('\n---\n');
      console.log('ID Token:');
      console.log(idToken);
      console.log('\n---\n');
      console.log('To use in k6:');
      console.log(`export ACCESS_TOKEN="${accessToken}"`);
      console.log(`k6 run phase2-comprehensive-test.js --env ACCESS_TOKEN="${accessToken}"`);
      
      return accessToken;
    } else {
      console.error('❌ No authentication result received');
      if (response.ChallengeName) {
        console.error(`Challenge required: ${response.ChallengeName}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    if (error.name === 'NotAuthorizedException') {
      console.error('\nPossible causes:');
      console.error('  - Incorrect username or password');
      console.error('  - User account is disabled');
      console.error('  - MFA is required (not supported in this script)');
    }
    process.exit(1);
  }
}

getToken();

