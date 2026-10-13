<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'status',
        'organization_id',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
        ];
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function deviceSessions(): HasMany
    {
        return $this->hasMany(DeviceSession::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function toPublicArray(bool $withSubscription = false): array
    {
        $data = [
            'id' => $this->id,
            'email' => $this->email,
            'full_name' => $this->name,
            'role' => $this->role,
            'status' => $this->status,
            'org_id' => $this->organization_id,
            'created_at' => optional($this->created_at)?->toIso8601String(),
            'updated_at' => optional($this->updated_at)?->toIso8601String(),
        ];

        if ($withSubscription) {
            if ($this->isAdmin()) {
                $data['subscription_active'] = true;
                $data['subscription_status'] = 'active';
                $data['subscription_expires_at'] = null;
                $data['organization_name'] = null;
            } elseif ($this->organization) {
                $org = $this->organization;
                $data['subscription_active'] = $org->isSubscriptionActive();
                $data['subscription_status'] = $org->subscription_status;
                $data['subscription_expires_at'] = optional($org->subscription_expires_at)?->toIso8601String();
                $data['organization_name'] = $org->name;
            } else {
                $data['subscription_active'] = false;
                $data['subscription_status'] = 'none';
                $data['subscription_expires_at'] = null;
                $data['organization_name'] = null;
            }
        }

        return $data;
    }
}
