<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FeedbackMessage extends Model
{
    protected $table = 'feedback_messages';
    protected $primaryKey = 'message_id';
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
        'user_id',
        'content',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(Feedback::class, 'feedback_id', 'feedback_id');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(FeedbackAttachment::class, 'message_id', 'message_id');
    }
}

