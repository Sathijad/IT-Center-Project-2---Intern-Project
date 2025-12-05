<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFeedbackRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // Authorization handled by middleware
    }

    public function rules(): array
    {
        return [
            'status' => 'nullable|string|in:OPEN,IN_PROGRESS,RESOLVED,CLOSED,REJECTED',
            'assignee_id' => 'nullable|integer|exists:app_users,id',
            'priority' => 'nullable|string|in:LOW,MEDIUM,HIGH,URGENT',
            'labels' => 'nullable|array',
            'labels.*' => 'string|max:50',
        ];
    }
}

