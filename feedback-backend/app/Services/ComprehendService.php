<?php

namespace App\Services;

use Aws\Comprehend\ComprehendClient;
use Aws\Exception\AwsException;
use Illuminate\Support\Facades\Log;

class ComprehendService
{
    private ComprehendClient $comprehendClient;
    private string $region;

    public function __construct()
    {
        $this->region = config('aws.comprehend_region', config('aws.default_region'));

        $this->comprehendClient = new ComprehendClient([
            'version' => 'latest',
            'region' => $this->region,
            'credentials' => [
                'key' => config('aws.access_key_id'),
                'secret' => config('aws.secret_access_key'),
            ],
        ]);
    }

    public function analyzeSentiment(string $text): array
    {
        try {
            $result = $this->comprehendClient->detectSentiment([
                'Text' => $text,
                'LanguageCode' => 'en',
            ]);

            return [
                'sentiment' => $result['Sentiment'],
                'sentiment_score' => $result['SentimentScore'],
            ];
        } catch (AwsException $e) {
            Log::error('Comprehend sentiment analysis failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to analyze sentiment: ' . $e->getMessage());
        }
    }

    public function detectPii(string $text): array
    {
        try {
            $result = $this->comprehendClient->detectPiiEntities([
                'Text' => $text,
                'LanguageCode' => 'en',
            ]);

            $entities = [];
            foreach ($result['Entities'] as $entity) {
                $entities[] = [
                    'type' => $entity['Type'],
                    'score' => $entity['Score'],
                    'text' => substr($text, $entity['BeginOffset'], $entity['EndOffset'] - $entity['BeginOffset']),
                ];
            }

            return $entities;
        } catch (AwsException $e) {
            Log::error('Comprehend PII detection failed', ['error' => $e->getMessage()]);
            throw new \Exception('Failed to detect PII: ' . $e->getMessage());
        }
    }

    public function analyzeFeedback(string $description, array $messages = []): array
    {
        // Combine description and all messages for analysis
        $fullText = $description;
        foreach ($messages as $message) {
            $fullText .= "\n\n" . $message;
        }

        // Limit text length (Comprehend has a 5000 byte limit per request)
        if (strlen($fullText) > 4500) {
            $fullText = substr($fullText, 0, 4500);
        }

        $sentiment = $this->analyzeSentiment($fullText);
        $pii = $this->detectPii($fullText);

        return [
            'sentiment' => $sentiment['sentiment'],
            'sentiment_score' => $sentiment['sentiment_score'],
            'pii_entities' => $pii,
        ];
    }
}

