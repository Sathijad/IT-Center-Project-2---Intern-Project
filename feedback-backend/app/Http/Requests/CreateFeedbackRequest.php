<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class CreateFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'title' => 'required|string|max:200',
            'description' => 'required|string',
            'category' => 'required|string|max:50',
            'priority' => 'nullable|string|in:LOW,MEDIUM,HIGH,URGENT',
            'labels' => 'nullable|array',
            'labels.*' => 'string|max:50',
            'attachments' => 'nullable|array',
            'attachments.*.file_name' => 'required|string|max:255',
            'attachments.*.file_size' => 'nullable|integer|min:0',
            'attachments.*.mime_type' => 'nullable|string|max:100',
            'attachments.*.s3_key' => 'required|string|max:500',
        ];
    }
}

