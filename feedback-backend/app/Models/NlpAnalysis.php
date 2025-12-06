<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NlpAnalysis extends Model
{
    protected $table = 'nlp_analysis';
    protected $primaryKey = 'analysis_id';
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
        'sentiment',
        'sentiment_score',
        'pii_entities',
        'raw_response',
        'analyzed_at',
    ];

    protected $casts = [
        'sentiment_score' => 'array',
        'pii_entities' => 'array',
        'raw_response' => 'array',
        'analyzed_at' => 'datetime',
        'created_at' => 'datetime',
    ];

    public function feedback(): BelongsTo
    {
        return $this->belongsTo(Feedback::class, 'feedback_id', 'feedback_id');
    }
}

