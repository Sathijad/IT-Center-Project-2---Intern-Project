# Database and Cognito Configuration Reference

This document contains all the configuration details needed for another phase of this project.

---

## 🗄️ DATABASE CONFIGURATION

### PostgreSQL Database (Docker Container)

#### Connection Details
```
Host:       localhost
Port:       5432
Database:   itcenter_auth
Username:   itcenter
Password:   password
Container:  itcenter_pg
```

#### Docker Compose Configuration
```yaml
# File: infra/docker-compose.yml
postgres:
  image: postgres:16
  container_name: itcenter_pg
  environment:
    POSTGRES_DB: itcenter_auth
    POSTGRES_USER: itcenter
    POSTGRES_PASSWORD: password
  ports:
    - "5432:5432"
  volumes:
    - postgres_data:/var/lib/postgresql/data
```

#### JDBC Connection String
```
jdbc:postgresql://localhost:5432/itcenter_auth
```

#### Hibernate Settings
```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
```

#### Connection Pool Settings
```yaml
hikari:
  maximum-pool-size: 20
  minimum-idle: 5
  connection-timeout: 30000
  idle-timeout: 600000
  max-lifetime: 1800000
```

### Database Schema

#### Tables Overview
- **app_users**: User information
- **roles**: Role definitions
- **user_roles**: User-role mapping
- **login_audit**: Authentication and audit logs

#### Key Relationships
- `app_users` ↔ `user_roles` (many-to-many)
- `user_roles` ↔ `roles` (many-to-one)
- `login_audit` → `app_users` (many-to-one)

For complete schema details, see: `docs/ERD.md`

### Connecting to Database

#### Using Docker CLI
```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth
```

#### Using GUI Tools (DBeaver / pgAdmin)
- **Host:** localhost
- **Port:** 5432
- **Database:** itcenter_auth
- **Username:** itcenter
- **Password:** password

---

## 🔐 AWS COGNITO CONFIGURATION

### Cognito User Pool Details

```
User Pool ID:  ap-southeast-2_hTAYJId8y
Region:        ap-southeast-2
Client ID:     3rdnl5ind8guti89jrbob85r4i
Domain:        itcenter-auth.auth.ap-southeast-2.amazoncognito.com
```

### OAuth/OIDC Configuration

#### Web Application (Admin Portal)
```
Callback URL:  http://localhost:5173/auth/callback
Sign-out URL:  http://localhost:5173
Scopes:        openid, profile, email
Flow:          Authorization code grant with PKCE
```

#### Mobile Application
```
Sign-in URI:   myapp://auth
Sign-out URI:  myapp://signout
Scopes:        openid, profile, email
Flow:          Authorization code grant with PKCE
```

### JWT Configuration

#### Issuer URI
```
https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
```

#### JWKS Endpoint
```
https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json
```

#### Clock Skew
```
120 seconds
```

### Backend Configuration (Spring Boot)

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
          jwk-set-uri: https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json
          clock-skew: 120

cognito:
  user-pool-id: ap-southeast-2_hTAYJId8y
  client-id: 3rdnl5ind8guti89jrbob85r4i
  issuer-uri: https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y
  jwk-set-uri: https://cognito-idp.ap-southeast-2.amazonaws.com/ap-southeast-2_hTAYJId8y/.well-known/jwks.json
  domain: itcenter-auth.auth.ap-southeast-2.amazoncognito.com
  region: ap-southeast-2
```

### Frontend Configuration (React)

```typescript
// admin-web/src/config/env.ts
export const config = {
  API_BASE_URL: 'http://localhost:8080',
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
```

### Mobile Configuration (Flutter/Amplify)

```json
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
              "SignInRedirectURI": "myapp://auth",
              "SignOutRedirectURI": "myapp://signout",
              "Scopes": ["openid", "email", "profile"]
            }
          }
        }
      }
    }
  }
}
```

---

## 🔑 IMPORTANT NOTES

### Security Considerations

1. **Database Password**: The current password `password` is for development only. Change it in production.
2. **Cognito Secrets**: Never commit actual credentials to version control.
3. **JWKS Validation**: Backend validates all JWT tokens against Cognito's JWKS endpoint.
4. **PKCE Flow**: All applications use PKCE for enhanced security.

### Environment Variables

All configuration values support environment variables for different environments:

**Database:**
- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`

**Cognito:**
- `COGNITO_USER_POOL_ID`
- `COGNITO_CLIENT_ID`
- `COGNITO_DOMAIN`
- `COGNITO_REGION`
- `COGNITO_ISSUER_URI`
- `COGNITO_JWK_SET_URI`

### Testing

#### Default Test User
```
Email:    admin@itcenter.com
Password: [Set via AWS Cognito Console]
Role:     ADMIN
```

---

## 📚 ADDITIONAL RESOURCES

### Documentation Files
- Database Schema: `docs/ERD.md`
- Database Connection: `Explain Doc Files/Database Docs/HOW_TO_CONNECT_TO_DATABASE.md`
- Cognito Setup: `Explain Doc Files/Cognito Docs/COGNITO_SETUP.md`
- Mobile Cognito: `mobile-app/Mobile Docs/COGNITO_SETUP_INSTRUCTIONS.md`

### Configuration Files
- Backend: `auth-backend/src/main/resources/application.yml`
- Web Config: `admin-web/src/config/env.ts`
- Mobile Config: `mobile-app/lib/amplifyconfiguration_mobile.dart`
- Docker Compose: `infra/docker-compose.yml`

### AWS Console Links
- Cognito User Pool: https://console.aws.amazon.com/cognito/v2/idp/user-pools/ap-southeast-2_hTAYJId8y
- Region: ap-southeast-2 (Sydney)

---

## 🚀 Quick Start Commands

### Start Database
```powershell
docker compose -f infra/docker-compose.yml up -d
```

### Test Database Connection
```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT version();"
```

### View All Users
```powershell
docker exec -it itcenter_pg psql -U itcenter -d itcenter_auth -c "SELECT * FROM app_users;"
```

---

**Last Updated:** 2025-01-30  
**Project:** IT Center Auth - Phase 1


