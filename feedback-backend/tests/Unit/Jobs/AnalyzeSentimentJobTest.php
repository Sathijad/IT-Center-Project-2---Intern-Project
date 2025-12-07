<?php

namespace Tests\Unit\Jobs;

use Tests\TestCase;
use App\Jobs\AnalyzeSentimentJob;
use App\Models\Feedback;
use App\Models\FeedbackMessage;
use App\Models\NlpAnalysis;
use App\Services\ComprehendService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Mockery;

class AnalyzeSentimentJobTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('aws.use_mock_comprehend', true);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_analyze_sentiment_job_processes_feedback(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS feedback (
            feedback_id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) DEFAULT \'MEDIUM\',
            status VARCHAR(20) DEFAULT \'OPEN\',
            created_by BIGINT NOT NULL,
            assigned_to BIGINT,
            labels TEXT DEFAULT \'{}\',
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )');
        
        DB::statement('CREATE TABLE IF NOT EXISTS feedback_messages (
            message_id VARCHAR(36) PRIMARY KEY,
            feedback_id VARCHAR(36) NOT NULL,
            user_id BIGINT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP
        )');
        
        DB::statement('CREATE TABLE IF NOT EXISTS nlp_analysis (
            analysis_id VARCHAR(36) PRIMARY KEY,
            feedback_id VARCHAR(36) NOT NULL,
            sentiment VARCHAR(20),
            sentiment_score TEXT,
            pii_entities TEXT,
            raw_response TEXT,
            analyzed_at TIMESTAMP,
            created_at TIMESTAMP
        )');
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'This is a great feature! I love it.',
            'category' => 'BUG',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Ensure ComprehendService is in mock mode
        Config::set('aws.use_mock_comprehend', true);
        Config::set('aws.access_key_id', '');
        Config::set('aws.secret_access_key', '');
        
        $job = new AnalyzeSentimentJob($feedbackId);
        $comprehendService = new ComprehendService();
        
        try {
            $job->handle($comprehendService);
        } catch (\Exception $e) {
            $this->fail('Job execution failed: ' . $e->getMessage());
        }

        $analysis = NlpAnalysis::where('feedback_id', $feedbackId)->first();

        $this->assertNotNull($analysis, 'NLP analysis should be created');
        $this->assertNotNull($analysis->raw_response, 'Raw response should be stored');
        
        // raw_response is stored as JSON string in SQLite, decode it
        $rawResponse = is_string($analysis->raw_response) 
            ? json_decode($analysis->raw_response, true) 
            : $analysis->raw_response;
        $this->assertIsArray($rawResponse);
        $this->assertArrayHasKey('sentiment', $rawResponse);
    }

    public function test_analyze_sentiment_job_handles_messages(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS feedback (
            feedback_id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) DEFAULT \'MEDIUM\',
            status VARCHAR(20) DEFAULT \'OPEN\',
            created_by BIGINT NOT NULL,
            assigned_to BIGINT,
            labels TEXT[] DEFAULT \'{}\',
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )');
        
        DB::statement('CREATE TABLE IF NOT EXISTS feedback_messages (
            message_id VARCHAR(36) PRIMARY KEY,
            feedback_id VARCHAR(36) NOT NULL,
            user_id BIGINT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP
        )');
        
        DB::statement('CREATE TABLE IF NOT EXISTS nlp_analysis (
            analysis_id VARCHAR(36) PRIMARY KEY,
            feedback_id VARCHAR(36) NOT NULL,
            sentiment VARCHAR(20),
            sentiment_score JSONB,
            pii_entities JSONB,
            raw_response JSONB,
            analyzed_at TIMESTAMP,
            created_at TIMESTAMP
        )');
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'Initial description',
            'category' => 'BUG',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        DB::table('feedback_messages')->insert([
            'message_id' => (string) \Illuminate\Support\Str::uuid(),
            'feedback_id' => $feedbackId,
            'user_id' => 1,
            'content' => 'This is a follow-up message',
            'created_at' => now(),
        ]);

        $job = new AnalyzeSentimentJob($feedbackId);
        $comprehendService = new ComprehendService();
        $job->handle($comprehendService);

        $analysis = NlpAnalysis::where('feedback_id', $feedbackId)->first();

        $this->assertNotNull($analysis);
    }

    public function test_analyze_sentiment_job_handles_errors_gracefully(): void
    {
        DB::statement('CREATE TABLE IF NOT EXISTS feedback (
            feedback_id VARCHAR(36) PRIMARY KEY,
            title VARCHAR(200) NOT NULL,
            description TEXT NOT NULL,
            category VARCHAR(50) NOT NULL,
            priority VARCHAR(20) DEFAULT \'MEDIUM\',
            status VARCHAR(20) DEFAULT \'OPEN\',
            created_by BIGINT NOT NULL,
            assigned_to BIGINT,
            labels TEXT[] DEFAULT \'{}\',
            created_at TIMESTAMP,
            updated_at TIMESTAMP
        )');
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Use a mock that throws an exception
        $comprehendServiceMock = Mockery::mock(ComprehendService::class);
        $comprehendServiceMock->shouldReceive('analyzeFeedback')
            ->andThrow(new \Exception('Test error'));

        $job = new AnalyzeSentimentJob($feedbackId);

        // Should not throw exception
        $job->handle($comprehendServiceMock);

        // Job should complete without crashing
        $this->assertTrue(true);
    }
}

