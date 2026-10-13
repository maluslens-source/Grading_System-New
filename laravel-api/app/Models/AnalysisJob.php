<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AnalysisJob extends Model
{
    use HasUuids;

    protected $fillable = [
        'user_id',
        'organization_id',
        'status',
        'lot_id',
        'lot_name',
        'crates_sampled',
        'average_weight_kg',
        'total_sampled_weight_kg',
        'image_paths',
        'retry_count',
        'max_retries',
        'error_message',
        'result_json',
        'started_at',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'image_paths' => 'array',
            'result_json' => 'array',
            'crates_sampled' => 'float',
            'average_weight_kg' => 'float',
            'total_sampled_weight_kg' => 'float',
            'started_at' => 'datetime',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function toStatusArray(): array
    {
        return [
            'job_id' => $this->id,
            'status' => $this->status,
            'lot_id' => $this->lot_id,
            'lot_name' => $this->lot_name,
            'retry_count' => $this->retry_count,
            'max_retries' => $this->max_retries,
            'error_message' => $this->error_message,
            'created_at' => optional($this->created_at)?->toIso8601String(),
            'updated_at' => optional($this->updated_at)?->toIso8601String(),
            'started_at' => optional($this->started_at)?->toIso8601String(),
            'completed_at' => optional($this->completed_at)?->toIso8601String(),
            'result' => $this->result_json,
        ];
    }
}
