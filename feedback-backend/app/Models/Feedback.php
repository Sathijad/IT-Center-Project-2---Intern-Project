<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Feedback extends Model
{
    protected $table = 'feedback';
    protected $primaryKey = 'feedback_id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'title',
        'description',
        'category',
        'priority',
        'status',
        'created_by',
        'assigned_to',
        'labels',
    ];

    protected $casts = [
        'labels' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function messages(): HasMany
    {
        return $this->hasMany(FeedbackMessage::class, 'feedback_id', 'feedback_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(FeedbackAttachment::class, 'feedback_id', 'feedback_id');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(FeedbackAudit::class, 'feedback_id', 'feedback_id');
    }

    public function nlpAnalysis(): HasMany
    {
        return $this->hasMany(NlpAnalysis::class, 'feedback_id', 'feedback_id');
    }
}

