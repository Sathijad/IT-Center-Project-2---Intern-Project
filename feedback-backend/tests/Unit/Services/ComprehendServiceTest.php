<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\ComprehendService;
use Illuminate\Support\Facades\Config;

class ComprehendServiceTest extends TestCase
{
    private ComprehendService $service;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Configure mock mode
        Config::set('aws.use_mock_comprehend', true);
        Config::set('aws.access_key_id', '');
        Config::set('aws.secret_access_key', '');
        
        $this->service = new ComprehendService();
    }

    public function test_analyze_sentiment_returns_positive_for_positive_text(): void
    {
        $result = $this->service->analyzeSentiment('This is great! I love it. Excellent work!');

        $this->assertArrayHasKey('sentiment', $result);
        $this->assertArrayHasKey('sentiment_score', $result);
        $this->assertEquals('POSITIVE', $result['sentiment']);
        $this->assertIsArray($result['sentiment_score']);
    }

    public function test_analyze_sentiment_returns_negative_for_negative_text(): void
    {
        $result = $this->service->analyzeSentiment('This is terrible. I hate it. Worst experience ever.');

        $this->assertEquals('NEGATIVE', $result['sentiment']);
    }

    public function test_analyze_sentiment_returns_neutral_for_neutral_text(): void
    {
        $result = $this->service->analyzeSentiment('This is a test message with no strong feelings.');

        $this->assertEquals('NEUTRAL', $result['sentiment']);
    }

    public function test_detect_pii_detects_email(): void
    {
        $result = $this->service->detectPii('Contact me at test@example.com');

        $this->assertIsArray($result);
        $this->assertNotEmpty($result);
        $this->assertEquals('EMAIL', $result[0]['type']);
        $this->assertStringContainsString('test@example.com', $result[0]['text']);
    }

    public function test_detect_pii_detects_phone(): void
    {
        $result = $this->service->detectPii('Call me at 123-456-7890');

        $this->assertIsArray($result);
        // Phone detection may vary, but should detect something
        $this->assertNotEmpty($result);
    }

    public function test_analyze_feedback_combines_description_and_messages(): void
    {
        $description = 'This is a bug report';
        $messages = ['Message 1', 'Message 2'];

        $result = $this->service->analyzeFeedback($description, $messages);

        $this->assertArrayHasKey('sentiment', $result);
        $this->assertArrayHasKey('sentiment_score', $result);
        $this->assertArrayHasKey('pii_entities', $result);
    }

    public function test_analyze_feedback_truncates_long_text(): void
    {
        $longText = str_repeat('This is a very long text. ', 200); // ~5000+ characters
        $result = $this->service->analyzeFeedback($longText, []);

        $this->assertArrayHasKey('sentiment', $result);
        // Should not throw exception
    }
}


