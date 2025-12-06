<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeedbackAttachment extends Model
{
    protected $table = 'feedback_attachments';
    protected $primaryKey = 'attachment_id';
    public $incrementing = false;
    protected $keyType = 'string';
    
    // Disable updated_at since the table doesn't have this column
    public $timestamps = true;
    const UPDATED_AT = null;
    
    /**
     * Get the name of the "updated at" column.
     * Return null to disable updated_at
     */
    public function getUpdatedAtColumn()
    {
        return null;
    }

    protected $fillable = [
        'feedback_id',
        'message_id',
        's3_key',
        'file_name',
        'file_size',
        'mime_type',
        'uploaded_by',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'created_at' => 'datetime',
    ];

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(Feedback::class, 'feedback_id', 'feedback_id');
    }

    public function message(): BelongsTo
    {
        return $this->belongsTo(FeedbackMessage::class, 'message_id', 'message_id');
    }
}

