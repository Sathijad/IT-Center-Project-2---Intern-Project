<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Feedback extends Model
{
    use HasFactory;

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
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Custom accessor for labels to handle PostgreSQL array format
     */
    public function getLabelsAttribute($value)
    {
        if (is_null($value)) {
            return [];
        }
        
        // If it's already an array, return it
        if (is_array($value)) {
            return $value;
        }
        
        // If it's a PostgreSQL array string like "{value1,value2}" or '{"value1","value2"}', parse it
        if (is_string($value)) {
            // Remove surrounding braces
            $value = trim($value, '{}');
            if ($value === '') {
                return [];
            }
            
            // Handle quoted values
            $result = [];
            $current = '';
            $inQuotes = false;
            $escaped = false;
            
            for ($i = 0; $i < strlen($value); $i++) {
                $char = $value[$i];
                
                if ($escaped) {
                    $current .= $char;
                    $escaped = false;
                    continue;
                }
                
                if ($char === '\\') {
                    $escaped = true;
                    $current .= $char;
                    continue;
                }
                
                if ($char === '"') {
                    $inQuotes = !$inQuotes;
                    continue;
                }
                
                if ($char === ',' && !$inQuotes) {
                    if ($current !== '') {
                        $result[] = $current;
                        $current = '';
                    }
                    continue;
                }
                
                $current .= $char;
            }
            
            if ($current !== '') {
                $result[] = $current;
            }
            
            return $result;
        }
        
        // Try JSON decode as fallback
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Custom mutator for labels to convert array to PostgreSQL array format
     */
    public function setLabelsAttribute($value)
    {
        if (is_null($value) || (is_array($value) && empty($value))) {
            $this->attributes['labels'] = '{}';
            return;
        }
        
        if (is_array($value)) {
            // Convert array to PostgreSQL array format: {"value1","value2"}
            $formatted = array_map(function($item) {
                // Escape backslashes and double quotes
                $item = str_replace('\\', '\\\\', (string)$item);
                $item = str_replace('"', '\\"', $item);
                return '"' . $item . '"';
            }, $value);
            
            $this->attributes['labels'] = '{' . implode(',', $formatted) . '}';
            return;
        }
        
        $this->attributes['labels'] = $value;
    }

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
