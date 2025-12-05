<?php

return [
    'default' => env('QUEUE_CONNECTION', 'sqs'),

    'connections' => [
        'sync' => [
            'driver' => 'sync',
        ],

        'sqs' => [
            'driver' => 'sqs',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'prefix' => env('AWS_SQS_PREFIX', 'feedback-'),
            'queue' => env('AWS_SQS_QUEUE', 'default'),
            'suffix' => env('AWS_SQS_SUFFIX'),
            'region' => env('AWS_DEFAULT_REGION', 'ap-southeast-2'),
            'after_commit' => false,
        ],
    ],

    'failed' => [
        'driver' => env('QUEUE_FAILED_DRIVER', 'database-uuids'),
        'database' => env('DB_CONNECTION', 'pgsql'),
        'table' => 'failed_jobs',
    ],
];

