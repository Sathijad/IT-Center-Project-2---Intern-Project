<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\FeedbackService;
use App\Services\S3Service;
use App\Models\Feedback;
use App\Models\FeedbackMessage;
use App\Models\FeedbackAttachment;
use App\Models\FeedbackAudit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Mockery;

class FeedbackServiceTest extends TestCase
{
    use RefreshDatabase;

    private FeedbackService $service;
    private $s3ServiceMock;

    protected function setUp(): void
    {
        parent::setUp();
        $this->s3ServiceMock = Mockery::mock(S3Service::class);
        $this->service = new FeedbackService($this->s3ServiceMock);
    }

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    public function test_create_feedback_creates_feedback_with_correct_data(): void
    {
        // Setup database tables
        $this->createFeedbackTable();
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $data = [
            'title' => 'Test Feedback',
            'description' => 'This is a test feedback',
            'category' => 'BUG',
            'priority' => 'HIGH',
            'labels' => ['bug', 'urgent'],
        ];

        $feedback = $this->service->createFeedback($data, $user);

        $this->assertInstanceOf(Feedback::class, $feedback);
        $this->assertEquals('Test Feedback', $feedback->title);
        $this->assertEquals('This is a test feedback', $feedback->description);
        $this->assertEquals('BUG', $feedback->category);
        $this->assertEquals('HIGH', $feedback->priority);
        $this->assertEquals('OPEN', $feedback->status);
        $this->assertEquals(1, $feedback->created_by);
        $this->assertIsArray($feedback->labels);
    }
    
    private function createFeedbackTable(): void
    {
        // SQLite doesn't support arrays, so we use TEXT for labels
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
        
        DB::statement('CREATE TABLE IF NOT EXISTS feedback_audit (
            audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
            feedback_id VARCHAR(36) NOT NULL,
            user_id BIGINT NOT NULL,
            action VARCHAR(50) NOT NULL,
            old_value TEXT,
            new_value TEXT,
            metadata TEXT,
            created_at TIMESTAMP
        )');
        
        DB::statement('CREATE TABLE IF NOT EXISTS feedback_attachments (
            attachment_id VARCHAR(36) PRIMARY KEY,
            feedback_id VARCHAR(36),
            message_id VARCHAR(36),
            s3_key VARCHAR(500) NOT NULL,
            file_name VARCHAR(255) NOT NULL,
            file_size INTEGER,
            mime_type VARCHAR(100),
            uploaded_by BIGINT NOT NULL,
            created_at TIMESTAMP
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
    }

    public function test_create_feedback_creates_audit_log(): void
    {
        $this->createFeedbackTable();
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $data = [
            'title' => 'Test Feedback',
            'description' => 'Test description',
            'category' => 'BUG',
        ];

        $feedback = $this->service->createFeedback($data, $user);

        $audit = FeedbackAudit::where('feedback_id', $feedback->feedback_id)
            ->where('action', 'CREATED')
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals(1, $audit->user_id);
    }

    public function test_create_feedback_handles_attachments(): void
    {
        $this->createFeedbackTable();
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $data = [
            'title' => 'Test Feedback',
            'description' => 'Test description',
            'category' => 'BUG',
        ];
        
        $attachments = [
            [
                's3_key' => 'test/key',
                'file_name' => 'test.pdf',
                'file_size' => 1024,
                'mime_type' => 'application/pdf',
            ],
        ];

        $feedback = $this->service->createFeedback($data, $user, $attachments);

        // Reload feedback to ensure attachments are loaded
        $feedback->refresh();
        $feedback->load('attachments');
        
        $this->assertCount(1, $feedback->attachments);
        $this->assertEquals('test.pdf', $feedback->attachments->first()->file_name);
    }

    public function test_get_feedback_list_returns_paginated_results(): void
    {
        $this->createFeedbackTable();
        
        // Create test feedbacks manually
        for ($i = 0; $i < 5; $i++) {
            DB::table('feedback')->insert([
                'feedback_id' => \Illuminate\Support\Str::uuid(),
                'title' => "Test Feedback {$i}",
                'description' => 'Test description',
                'category' => 'BUG',
                'priority' => 'MEDIUM',
                'status' => 'OPEN',
                'created_by' => 1,
                'labels' => '{}',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $result = $this->service->getFeedbackList([], 1, 10, $user);

        $this->assertArrayHasKey('items', $result);
        $this->assertArrayHasKey('page', $result);
        $this->assertArrayHasKey('size', $result);
        $this->assertArrayHasKey('total_count', $result);
        $this->assertArrayHasKey('total_pages', $result);
        $this->assertEquals(1, $result['page']);
        $this->assertEquals(10, $result['size']);
        $this->assertEquals(5, $result['total_count']);
    }

    public function test_get_feedback_list_filters_by_status(): void
    {
        $this->createFeedbackTable();
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'Open Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'status' => 'OPEN',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'Closed Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'status' => 'CLOSED',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $result = $this->service->getFeedbackList(['status' => 'OPEN'], 1, 10, $user);

        $this->assertEquals(1, $result['total_count']);
        $this->assertEquals('OPEN', $result['items']->first()->status);
    }

    public function test_get_feedback_list_employee_sees_only_own_feedback(): void
    {
        $this->createFeedbackTable();
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'User 1 Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'User 2 Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 2,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $result = $this->service->getFeedbackList([], 1, 10, $user);

        $this->assertEquals(1, $result['total_count']);
        $this->assertEquals(1, $result['items']->first()->created_by);
    }

    public function test_get_feedback_list_admin_sees_all_feedback(): void
    {
        $this->createFeedbackTable();
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'User 1 Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'User 2 Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 2,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $user = (object) ['id' => 1, 'roles' => ['ADMIN']];
        $result = $this->service->getFeedbackList([], 1, 10, $user);

        $this->assertEquals(2, $result['total_count']);
    }

    public function test_get_feedback_by_id_returns_feedback(): void
    {
        $this->createFeedbackTable();
        
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
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $result = $this->service->getFeedbackById($feedbackId, $user);

        $this->assertInstanceOf(Feedback::class, $result);
        $this->assertEquals($feedbackId, $result->feedback_id);
    }

    public function test_get_feedback_by_id_returns_null_for_unauthorized_employee(): void
    {
        $this->createFeedbackTable();
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 2,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $result = $this->service->getFeedbackById($feedbackId, $user);

        $this->assertNull($result);
    }

    public function test_add_message_creates_message(): void
    {
        $this->createFeedbackTable();
        DB::statement('CREATE TABLE IF NOT EXISTS feedback_messages (
            message_id VARCHAR(36) PRIMARY KEY,
            feedback_id VARCHAR(36) NOT NULL,
            user_id BIGINT NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP
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
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];
        $message = $this->service->addMessage($feedbackId, 'Test message', $user);

        $this->assertInstanceOf(FeedbackMessage::class, $message);
        $this->assertEquals('Test message', $message->content);
        $this->assertEquals($feedbackId, $message->feedback_id);
        $this->assertEquals(1, $message->user_id);
    }

    public function test_add_message_throws_exception_for_unauthorized_user(): void
    {
        $this->createFeedbackTable();
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'created_by' => 2,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('You do not have permission to add messages to this feedback');

        $this->service->addMessage($feedbackId, 'Test message', $user);
    }

    public function test_update_feedback_updates_fields(): void
    {
        $this->createFeedbackTable();
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'status' => 'OPEN',
            'priority' => 'LOW',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $user = (object) ['id' => 1, 'roles' => ['ADMIN']];

        $updates = [
            'status' => 'IN_PROGRESS',
            'priority' => 'HIGH',
        ];

        $updated = $this->service->updateFeedback($feedbackId, $updates, $user);

        $this->assertEquals('IN_PROGRESS', $updated->status);
        $this->assertEquals('HIGH', $updated->priority);
    }

    public function test_update_feedback_creates_audit_log(): void
    {
        $this->createFeedbackTable();
        
        $feedbackId = \Illuminate\Support\Str::uuid();
        DB::table('feedback')->insert([
            'feedback_id' => $feedbackId,
            'title' => 'Test Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'status' => 'OPEN',
            'priority' => 'MEDIUM',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        $user = (object) ['id' => 1, 'roles' => ['ADMIN']];

        $this->service->updateFeedback($feedbackId, ['status' => 'CLOSED'], $user);

        $audit = FeedbackAudit::where('feedback_id', $feedbackId)
            ->where('action', 'UPDATED')
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals(1, $audit->user_id);
    }

    public function test_update_feedback_throws_exception_for_non_admin(): void
    {
        $this->createFeedbackTable();
        
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
        
        $user = (object) ['id' => 1, 'roles' => ['EMPLOYEE']];

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Only administrators can update feedback');

        $this->service->updateFeedback($feedbackId, ['status' => 'CLOSED'], $user);
    }

    public function test_export_feedback_csv_generates_csv(): void
    {
        $this->createFeedbackTable();
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'Test Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'priority' => 'HIGH',
            'status' => 'OPEN',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $csv = $this->service->exportFeedbackCsv();

        $this->assertStringContainsString('Feedback ID', $csv);
        $this->assertStringContainsString('Test Feedback', $csv);
        $this->assertStringContainsString('BUG', $csv);
        $this->assertStringContainsString('HIGH', $csv);
    }

    public function test_export_feedback_csv_applies_filters(): void
    {
        $this->createFeedbackTable();
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'Open Feedback',
            'description' => 'Test',
            'category' => 'BUG',
            'status' => 'OPEN',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        
        DB::table('feedback')->insert([
            'feedback_id' => \Illuminate\Support\Str::uuid(),
            'title' => 'Closed Feedback',
            'description' => 'Test',
            'category' => 'FEATURE',
            'status' => 'CLOSED',
            'created_by' => 1,
            'labels' => '{}',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $csv = $this->service->exportFeedbackCsv(['status' => 'OPEN']);

        $this->assertStringContainsString('OPEN', $csv);
        $this->assertStringNotContainsString('CLOSED', $csv);
    }
}

