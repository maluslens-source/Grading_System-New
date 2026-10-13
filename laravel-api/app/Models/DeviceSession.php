<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeviceSession extends Model
{
    protected $table = 'sessions_devices';

    protected $fillable = [
        'user_id',
        'device_id',
        'token_hash',
        'expires_at',
        'revoked',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'revoked' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isValidFor(string $deviceId): bool
    {
        return ! $this->revoked
            && $this->device_id === $deviceId
            && $this->expires_at->isFuture();
    }
}
