<?php

return [
    'cognito' => [
        'user_pool_id' => env('COGNITO_USER_POOL_ID'),
        'client_id' => env('COGNITO_CLIENT_ID'),
        'issuer_uri' => env('COGNITO_ISSUER_URI'),
        'jwk_set_uri' => env('COGNITO_JWK_SET_URI'),
        'region' => env('COGNITO_REGION', 'ap-southeast-2'),
    ],

    'teams' => [
        'webhook_url' => env('TEAMS_WEBHOOK_URL'),
        'bot_token' => env('TEAMS_BOT_TOKEN'),
    ],
];

