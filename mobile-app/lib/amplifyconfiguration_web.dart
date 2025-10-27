const amplifyconfigWeb = r'''
{
  "auth": {
    "plugins": {
      "awsCognitoAuthPlugin": {
        "CognitoUserPool": {
          "Default": {
            "PoolId": "ap-southeast-2_hTAYJId8y",
            "AppClientId": "3rdnl5ind8guti89jrbob85r4i",
            "Region": "ap-southeast-2"
          }
        },
        "Auth": {
          "Default": {
            "OAuth": {
              "WebDomain": "itcenter-auth.auth.ap-southeast-2.amazoncognito.com",
              "AppClientId": "3rdnl5ind8guti89jrbob85r4i",
              "SignInRedirectURI": "http://localhost:56956/",
              "SignOutRedirectURI": "http://localhost:56956/",
              "Scopes": ["openid","email","profile"]
            }
          }
        }
      }
    }
  }
}
''';

