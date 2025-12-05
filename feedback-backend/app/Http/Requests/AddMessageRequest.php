<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AddMessageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'content' => 'required|string',
            'attachments' => 'nullable|array',
            'attachments.*.file_name' => 'required|string|max:255',
            'attachments.*.file_size' => 'nullable|integer|min:0',
            'attachments.*.mime_type' => 'nullable|string|max:100',
            'attachments.*.s3_key' => 'required|string|max:500',
        ];
    }
}

