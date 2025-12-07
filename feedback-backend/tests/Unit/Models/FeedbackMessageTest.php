<?php

namespace Tests\Unit\Models;

use Tests\TestCase;
use App\Models\FeedbackMessage;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FeedbackMessageTest extends TestCase
{
    use RefreshDatabase;

    public function test_feedback_message_has_correct_table_name(): void
    {
        $message = new FeedbackMessage();
        $this->assertEquals('feedback_messages', $message->getTable());
    }

    public function test_feedback_message_has_uuid_primary_key(): void
    {
        $message = new FeedbackMessage();
        $this->assertEquals('message_id', $message->getKeyName());
        $this->assertFalse($message->getIncrementing());
        $this->assertEquals('string', $message->getKeyType());
    }

    public function test_feedback_message_fillable_attributes(): void
    {
        $message = new FeedbackMessage();
        $expected = [
            'feedback_id',
            'user_id',
            'content',
        ];
        $this->assertEquals($expected, $message->getFillable());
    }
}


