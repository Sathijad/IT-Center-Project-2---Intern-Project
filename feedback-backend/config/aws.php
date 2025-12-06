<?php

return [
    'access_key_id' => env('AWS_ACCESS_KEY_ID'),
    'secret_access_key' => env('AWS_SECRET_ACCESS_KEY'),
    'default_region' => env('AWS_DEFAULT_REGION', 'ap-southeast-2'),
    
    // Use mock/stub for Comprehend when AWS credentials are missing or Comprehend is not available
    'use_mock_comprehend' => env('AWS_USE_MOCK_COMPREHEND', false),

    's3' => [
        'bucket' => env('AWS_S3_BUCKET'),
        'region' => env('AWS_S3_REGION', env('AWS_DEFAULT_REGION', 'ap-southeast-2')),
    ],

    'comprehend' => [
        'region' => env('AWS_COMPREHEND_REGION', env('AWS_DEFAULT_REGION', 'ap-southeast-2')),
    ],

    'sqs' => [
        'prefix' => env('AWS_SQS_PREFIX', 'feedback-'),
        'queues' => [
            'sentiment' => env('AWS_SQS_QUEUE_SENTIMENT', 'feedback-sentiment-analysis'),
            'teams' => env('AWS_SQS_QUEUE_TEAMS', 'feedback-teams-notifications'),
            'email' => env('AWS_SQS_QUEUE_EMAIL', 'feedback-email-notifications'),
        ],
    ],
];

