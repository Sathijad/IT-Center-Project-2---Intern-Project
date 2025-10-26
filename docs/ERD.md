# IT Center Auth - Entity Relationship Diagram

## Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                         app_users                            │
├─────────────────────────────────────────────────────────────┤
│ id               BIGINT PK                                   │
│ cognito_sub      VARCHAR(255) UNIQUE NOT NULL                │
│ email            VARCHAR(255) UNIQUE NOT NULL                │
│ display_name     VARCHAR(50)                                 │
│ locale           VARCHAR(10) DEFAULT 'en'                    │
│ created_at       TIMESTAMP DEFAULT NOW()                     │
│ updated_at       TIMESTAMP DEFAULT NOW()                     │
│ last_login       TIMESTAMP                                   │
│ is_active        BOOLEAN DEFAULT true                        │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                           │ (many-to-many)
                           │
┌──────────────────────────┴──────────────────────────────┐
│                      user_roles                         │
├─────────────────────────────────────────────────────────┤
│ id               BIGINT PK                              │
│ user_id          BIGINT FK → app_users.id               │
│ role_id          BIGINT FK → roles.id                   │
│ assigned_by      BIGINT FK → app_users.id               │
│ assigned_at      TIMESTAMP DEFAULT NOW()                 │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                          roles                               │
├─────────────────────────────────────────────────────────────┤
│ id               BIGINT PK                                   │
│ name             VARCHAR(50) UNIQUE NOT NULL                 │
│ description      VARCHAR(255)                                │
│ created_at       TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       login_audit                            │
├─────────────────────────────────────────────────────────────┤
│ id               BIGINT PK                                   │
│ user_id          BIGINT FK → app_users.id                   │
│ event_type       VARCHAR(50) NOT NULL                        │
│                  (LOGIN_SUCCESS, LOGIN_FAILURE,              │
│                   ROLE_ASSIGNED, ROLE_REMOVED,              │
│                   PROFILE_UPDATED)                          │
│ ip_address       VARCHAR(45)                                 │
│ user_agent       VARCHAR(500)                                │
│ metadata         JSONB                                       │
│ created_at       TIMESTAMP DEFAULT NOW()                     │
└─────────────────────────────────────────────────────────────┘
```

## Relationships

- `app_users` ↔ `user_roles` (many-to-many via join table)
- `user_roles` ↔ `roles` (many-to-one)
- `login_audit` → `app_users` (many-to-one, tracks user events)

## Indexes

- `idx_users_email` on `app_users(email)`
- `idx_users_sub` on `app_users(cognito_sub)`
- `idx_audit_user_event` on `login_audit(user_id, event_type, created_at DESC)`
- `idx_user_roles_user` on `user_roles(user_id)`

## Data Retention

- `login_audit` records are retained for 180 days (configurable)
- Soft-deleted users maintain anonymized audit references

