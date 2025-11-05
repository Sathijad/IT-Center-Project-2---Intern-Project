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

## Phase 2 Schema Additions

```
┌─────────────────────────────────────────────────────────────┐
│                      leave_policies                            │
├─────────────────────────────────────────────────────────────┤
│ policy_id          BIGINT PK                                  │
│ name               VARCHAR(100) UNIQUE NOT NULL               │
│ description        VARCHAR(500)                                │
│ annual_limit       INTEGER NOT NULL                           │
│ carry_forward      INTEGER DEFAULT 0                          │
│ is_active          BOOLEAN DEFAULT true                       │
│ created_at         TIMESTAMP DEFAULT NOW()                    │
│ updated_at         TIMESTAMP DEFAULT NOW()                    │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │
                           │ (one-to-many)
                           │
┌──────────────────────────┴──────────────────────────────┐
│                    leave_requests                        │
├─────────────────────────────────────────────────────────┤
│ request_id          BIGINT PK                           │
│ user_id             BIGINT FK → app_users.id             │
│ policy_id           BIGINT FK → leave_policies.policy_id│
│ status              VARCHAR(20) DEFAULT 'PENDING'        │
│ start_date          DATE NOT NULL                        │
│ end_date            DATE NOT NULL                         │
│ reason              TEXT                                 │
│ created_at          TIMESTAMP DEFAULT NOW()               │
│ updated_at          TIMESTAMP DEFAULT NOW()               │
└─────────────────────────────────────────────────────────┘
                           │
                           │ (one-to-many)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                      leave_audit                             │
├─────────────────────────────────────────────────────────────┤
│ audit_id            BIGINT PK                                │
│ request_id          BIGINT FK → leave_requests.request_id    │
│ action              VARCHAR(50) NOT NULL                     │
│ actor_id            BIGINT FK → app_users.id                  │
│ timestamp           TIMESTAMP DEFAULT NOW()                  │
│ notes               TEXT                                     │
│ metadata            JSONB                                    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    leave_balances                             │
├─────────────────────────────────────────────────────────────┤
│ balance_id          BIGINT PK                                │
│ user_id             BIGINT FK → app_users.id                 │
│ policy_id           BIGINT FK → leave_policies.policy_id      │
│ balance_days        DECIMAL(10,2) NOT NULL                    │
│ year                INTEGER NOT NULL                         │
│ updated_at          TIMESTAMP DEFAULT NOW()                  │
│ UNIQUE(user_id, policy_id, year)                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    attendance_logs                            │
├─────────────────────────────────────────────────────────────┤
│ log_id              BIGINT PK                                │
│ user_id             BIGINT FK → app_users.id                 │
│ clock_in            TIMESTAMP NOT NULL                       │
│ clock_out           TIMESTAMP                                 │
│ duration_minutes     INTEGER                                  │
│ geo_location        JSONB                                    │
│ created_at          TIMESTAMP DEFAULT NOW()                   │
└─────────────────────────────────────────────────────────────┘
```

## Indexes

- `idx_users_email` on `app_users(email)`
- `idx_users_sub` on `app_users(cognito_sub)`
- `idx_audit_user_event` on `login_audit(user_id, event_type, created_at DESC)`
- `idx_user_roles_user` on `user_roles(user_id)`

## Data Retention

- `login_audit` records are retained for 180 days (configurable)
- Soft-deleted users maintain anonymized audit references

