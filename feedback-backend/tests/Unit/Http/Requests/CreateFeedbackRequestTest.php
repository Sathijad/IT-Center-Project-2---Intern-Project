<?php

namespace Tests\Unit\Http\Requests;

use Tests\TestCase;
use App\Http\Requests\CreateFeedbackRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Validator;

class CreateFeedbackRequestTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_feedback_request_validation_rules(): void
    {
        $request = new CreateFeedbackRequest();
        $rules = $request->rules();

        $this->assertArrayHasKey('title', $rules);
        $this->assertArrayHasKey('description', $rules);
        $this->assertArrayHasKey('category', $rules);
        $this->assertArrayHasKey('priority', $rules);
        $this->assertArrayHasKey('labels', $rules);
        $this->assertArrayHasKey('attachments', $rules);
    }

    public function test_create_feedback_request_validates_required_fields(): void
    {
        $request = new CreateFeedbackRequest();
        $rules = $request->rules();

        $validator = Validator::make([], $rules);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('title', $validator->errors()->toArray());
        $this->assertArrayHasKey('description', $validator->errors()->toArray());
        $this->assertArrayHasKey('category', $validator->errors()->toArray());
    }

    public function test_create_feedback_request_validates_priority_enum(): void
    {
        $request = new CreateFeedbackRequest();
        $rules = $request->rules();

        $validator = Validator::make([
            'title' => 'Test',
            'description' => 'Test description',
            'category' => 'BUG',
            'priority' => 'INVALID',
        ], $rules);

        $this->assertTrue($validator->fails());
        $this->assertArrayHasKey('priority', $validator->errors()->toArray());
    }

    public function test_create_feedback_request_accepts_valid_priority(): void
    {
        $request = new CreateFeedbackRequest();
        $rules = $request->rules();

        $validator = Validator::make([
            'title' => 'Test',
            'description' => 'Test description',
            'category' => 'BUG',
            'priority' => 'HIGH',
        ], $rules);

        $this->assertFalse($validator->fails());
    }

    public function test_create_feedback_request_validates_labels_array(): void
    {
        $request = new CreateFeedbackRequest();
        $rules = $request->rules();

        $validator = Validator::make([
            'title' => 'Test',
            'description' => 'Test description',
            'category' => 'BUG',
            'labels' => 'not-an-array',
        ], $rules);

        $this->assertTrue($validator->fails());
    }

    public function test_create_feedback_request_validates_attachments_structure(): void
    {
        $request = new CreateFeedbackRequest();
        $rules = $request->rules();

        $validator = Validator::make([
            'title' => 'Test',
            'description' => 'Test description',
            'category' => 'BUG',
            'attachments' => [
                [
                    'file_name' => 'test.pdf',
                    's3_key' => 'test/key',
                ],
            ],
        ], $rules);

        $this->assertFalse($validator->fails());
    }

    public function test_create_feedback_request_authorize_returns_true(): void
    {
        $request = new CreateFeedbackRequest();
        $this->assertTrue($request->authorize());
    }
}


