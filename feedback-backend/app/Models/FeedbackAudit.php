<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackAudit extends Model
{
    protected $table = 'feedback_audit';
    protected $primaryKey = 'audit_id';
    public $incrementing = true;
    protected $keyType = 'integer';

    protected $fillable = [
        'feedback_id',
        'user_id',
        'action',
        'old_value',
        'new_value',
        'metadata',
    ];

    protected $casts = [
        'old_value' => 'array',
        'new_value' => 'array',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(Feedback::class, 'feedback_id', 'feedback_id');
    }
}

