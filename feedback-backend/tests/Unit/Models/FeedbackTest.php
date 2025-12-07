<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\Feedback;
use App\Models\FeedbackMessage;
use App\Models\FeedbackAttachment;
use App\Models\FeedbackAudit;
use App\Models\NlpAnalysis;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FeedbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_feedback_has_correct_table_name(): void
    {
        $feedback = new Feedback();
        $this->assertEquals('feedback', $feedback->getTable());
    }

    public function test_feedback_has_uuid_primary_key(): void
    {
        $feedback = new Feedback();
        $this->assertEquals('feedback_id', $feedback->getKeyName());
        $this->assertFalse($feedback->getIncrementing());
        $this->assertEquals('string', $feedback->getKeyType());
    }

    public function test_feedback_fillable_attributes(): void
    {
        $feedback = new Feedback();
        $expected = [
            'title',
            'description',
            'category',
            'priority',
            'status',
            'created_by',
            'assigned_to',
            'labels',
        ];
        $this->assertEquals($expected, $feedback->getFillable());
    }

    public function test_feedback_labels_accessor_handles_null(): void
    {
        $feedback = new Feedback();
        $feedback->setRawAttributes(['labels' => null]);
        $this->assertEquals([], $feedback->labels);
    }

    public function test_feedback_labels_accessor_handles_empty_array(): void
    {
        $feedback = new Feedback();
        $feedback->setRawAttributes(['labels' => '{}']);
        $this->assertEquals([], $feedback->labels);
    }

    public function test_feedback_labels_accessor_handles_postgres_array(): void
    {
        $feedback = new Feedback();
        $feedback->setRawAttributes(['labels' => '{"bug","feature","urgent"}']);
        $labels = $feedback->labels;
        $this->assertIsArray($labels);
        $this->assertContains('bug', $labels);
        $this->assertContains('feature', $labels);
        $this->assertContains('urgent', $labels);
    }

    public function test_feedback_labels_mutator_converts_array_to_postgres_format(): void
    {
        $feedback = new Feedback();
        $feedback->labels = ['bug', 'feature'];
        $this->assertStringContainsString('"bug"', $feedback->getAttributes()['labels']);
        $this->assertStringContainsString('"feature"', $feedback->getAttributes()['labels']);
    }

    public function test_feedback_labels_mutator_handles_null(): void
    {
        $feedback = new Feedback();
        $feedback->labels = null;
        $this->assertEquals('{}', $feedback->getAttributes()['labels']);
    }

    public function test_feedback_labels_mutator_handles_empty_array(): void
    {
        $feedback = new Feedback();
        $feedback->labels = [];
        $this->assertEquals('{}', $feedback->getAttributes()['labels']);
    }

    public function test_feedback_has_messages_relationship(): void
    {
        $feedback = new Feedback();
        $relation = $feedback->messages();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $relation);
        $this->assertEquals('feedback_id', $relation->getForeignKeyName());
    }

    public function test_feedback_has_attachments_relationship(): void
    {
        $feedback = new Feedback();
        $relation = $feedback->attachments();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $relation);
        $this->assertEquals('feedback_id', $relation->getForeignKeyName());
    }

    public function test_feedback_has_audit_logs_relationship(): void
    {
        $feedback = new Feedback();
        $relation = $feedback->auditLogs();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $relation);
        $this->assertEquals('feedback_id', $relation->getForeignKeyName());
    }

    public function test_feedback_has_nlp_analysis_relationship(): void
    {
        $feedback = new Feedback();
        $relation = $feedback->nlpAnalysis();
        $this->assertInstanceOf(\Illuminate\Database\Eloquent\Relations\HasMany::class, $relation);
        $this->assertEquals('feedback_id', $relation->getForeignKeyName());
    }
}


