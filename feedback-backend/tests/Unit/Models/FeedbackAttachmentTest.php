<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\FeedbackAttachment;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FeedbackAttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_feedback_attachment_has_correct_table_name(): void
    {
        $attachment = new FeedbackAttachment();
        $this->assertEquals('feedback_attachments', $attachment->getTable());
    }

    public function test_feedback_attachment_has_uuid_primary_key(): void
    {
        $attachment = new FeedbackAttachment();
        $this->assertEquals('attachment_id', $attachment->getKeyName());
        $this->assertFalse($attachment->getIncrementing());
        $this->assertEquals('string', $attachment->getKeyType());
    }

    public function test_feedback_attachment_fillable_attributes(): void
    {
        $attachment = new FeedbackAttachment();
        $expected = [
            'feedback_id',
            'message_id',
            's3_key',
            'file_name',
            'file_size',
            'mime_type',
            'uploaded_by',
        ];
        $this->assertEquals($expected, $attachment->getFillable());
    }
}


