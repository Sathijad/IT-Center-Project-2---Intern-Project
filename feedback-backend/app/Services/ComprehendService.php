<?php

namespace App\Services;

use Aws\Comprehend\ComprehendClient;
use Aws\Exception\AwsException;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class ComprehendService
{
    private ?ComprehendClient $comprehendClient;
    private string $region;
    private bool $useMock;

    public function __construct()
    {
        $this->region = config('aws.comprehend_region', config('aws.default_region'));
        
        // Check if mock mode is enabled or if AWS credentials are missing
        $this->useMock = config('aws.use_mock_comprehend', false) || 
                        empty(config('aws.access_key_id')) || 
                        empty(config('aws.secret_access_key'));

        if (!$this->useMock) {
            $config = [
                'version' => 'latest',
                'region' => $this->region,
                'credentials' => [
                    'key' => config('aws.access_key_id'),
                    'secret' => config('aws.secret_access_key'),
                ],
            ];

            // Fix SSL certificate issue on Windows (development only)
            // In production, download CA bundle and set curl.cainfo in php.ini
            if (PHP_OS_FAMILY === 'Windows') {
                $caBundle = ini_get('curl.cainfo');
                if (empty($caBundle) || !file_exists($caBundle)) {
                    // Create Guzzle HTTP client with SSL verification disabled for development
                    // For production, download cacert.pem from https://curl.se/ca/cacert.pem
                    // and set curl.cainfo="C:\path\to\cacert.pem" in php.ini
                    $httpClient = new Client([
                        'verify' => false, // Disable SSL verification for development
                    ]);
                    
                    // Use appropriate Guzzle handler based on version
                    if (class_exists('\Aws\Handler\GuzzleV7\GuzzleHandler')) {
                        $config['http_handler'] = new \Aws\Handler\GuzzleV7\GuzzleHandler($httpClient);
                    } elseif (class_exists('\Aws\Handler\GuzzleV6\GuzzleHandler')) {
                        $config['http_handler'] = new \Aws\Handler\GuzzleV6\GuzzleHandler($httpClient);
                    }
                }
            }

            $this->comprehendClient = new ComprehendClient($config);
        } else {
            $this->comprehendClient = null;
            Log::info('ComprehendService using mock/stub mode (AWS Comprehend not available)');
        }
    }

    public function analyzeSentiment(string $text): array
    {
        // Use mock if AWS is not available
        if ($this->useMock || $this->comprehendClient === null) {
            return $this->mockAnalyzeSentiment($text);
        }

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
            Log::warning('Comprehend sentiment analysis failed, falling back to mock', ['error' => $e->getMessage()]);
            
            // Fallback to mock on any AWS error
            return $this->mockAnalyzeSentiment($text);
        }
    }

    public function detectPii(string $text): array
    {
        // Use mock if AWS is not available
        if ($this->useMock || $this->comprehendClient === null) {
            return $this->mockDetectPii($text);
        }

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
            Log::warning('Comprehend PII detection failed, falling back to mock', ['error' => $e->getMessage()]);
            
            // Fallback to mock on any AWS error
            return $this->mockDetectPii($text);
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

    /**
     * Mock sentiment analysis for development/testing
     * Uses keyword-based sentiment detection
     */
    private function mockAnalyzeSentiment(string $text): array
    {
        $textLower = strtolower($text);
        
        // Positive keywords
        $positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'happy', 'satisfied', 'pleased', 'thanks', 'thank you', 'helpful', 'perfect', 'awesome', 'brilliant'];
        
        // Negative keywords
        $negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'disappointed', 'hate', 'angry', 'frustrated', 'broken', 'error', 'bug', 'issue', 'problem', 'not working', 'failed', 'worst', 'poor', 'slow'];
        
        // Count positive and negative words
        $positiveCount = 0;
        $negativeCount = 0;
        
        foreach ($positiveWords as $word) {
            $positiveCount += substr_count($textLower, $word);
        }
        
        foreach ($negativeWords as $word) {
            $negativeCount += substr_count($textLower, $word);
        }
        
        // Determine sentiment
        $totalWords = str_word_count($text);
        $sentimentScore = ($positiveCount - $negativeCount) / max($totalWords, 1);
        
        if ($sentimentScore > 0.05) {
            $sentiment = 'POSITIVE';
            $positiveScore = min(0.85 + ($sentimentScore * 0.1), 0.95);
            $negativeScore = max(0.05 - ($sentimentScore * 0.1), 0.02);
            $neutralScore = 0.10;
            $mixedScore = 0.05;
        } elseif ($sentimentScore < -0.05) {
            $sentiment = 'NEGATIVE';
            $positiveScore = max(0.05 + ($sentimentScore * 0.1), 0.02);
            $negativeScore = min(0.85 - ($sentimentScore * 0.1), 0.95);
            $neutralScore = 0.10;
            $mixedScore = 0.05;
        } else {
            $sentiment = 'NEUTRAL';
            $positiveScore = 0.25;
            $negativeScore = 0.25;
            $neutralScore = 0.40;
            $mixedScore = 0.10;
        }
        
        // Normalize scores to sum to ~1.0
        $total = $positiveScore + $negativeScore + $neutralScore + $mixedScore;
        $positiveScore = round($positiveScore / $total, 4);
        $negativeScore = round($negativeScore / $total, 4);
        $neutralScore = round($neutralScore / $total, 4);
        $mixedScore = round($mixedScore / $total, 4);
        
        return [
            'sentiment' => $sentiment,
            'sentiment_score' => [
                'Positive' => $positiveScore,
                'Negative' => $negativeScore,
                'Neutral' => $neutralScore,
                'Mixed' => $mixedScore,
            ],
        ];
    }

    /**
     * Mock PII detection for development/testing
     * Uses regex patterns to detect common PII patterns
     */
    private function mockDetectPii(string $text): array
    {
        $entities = [];
        
        // Email pattern
        if (preg_match_all('/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/', $text, $matches)) {
            foreach ($matches[0] as $email) {
                $entities[] = [
                    'type' => 'EMAIL',
                    'score' => 0.95,
                    'text' => $email,
                ];
            }
        }
        
        // Phone number pattern (simple)
        if (preg_match_all('/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b\+\d{1,3}\s?\d{3}[-.]?\d{3}[-.]?\d{4}\b/', $text, $matches)) {
            foreach ($matches[0] as $phone) {
                $entities[] = [
                    'type' => 'PHONE',
                    'score' => 0.85,
                    'text' => $phone,
                ];
            }
        }
        
        // Credit card pattern (basic)
        if (preg_match_all('/\b\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}\b/', $text, $matches)) {
            foreach ($matches[0] as $card) {
                $entities[] = [
                    'type' => 'CREDIT_DEBIT_NUMBER',
                    'score' => 0.90,
                    'text' => $card,
                ];
            }
        }
        
        return $entities;
    }
}

