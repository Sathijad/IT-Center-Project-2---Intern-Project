<?php

// Parse CORS allowed origins from environment variable
// Accepts comma-separated string or array
$corsOrigins = env('CORS_ALLOWED_ORIGINS');
if ($corsOrigins) {
    $allowedOrigins = is_string($corsOrigins) 
        ? array_map('trim', explode(',', $corsOrigins))
        : (array) $corsOrigins;
} else {
    // Default origins including admin web and mobile app
    $allowedOrigins = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:56956',
        'http://127.0.0.1:56956',
        'http://localhost:8080',
    ];
}

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $allowedOrigins,

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,
];

