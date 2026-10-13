<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('BOOTSTRAP_ADMIN_EMAIL', 'admin@example.com');
        $password = env('BOOTSTRAP_ADMIN_PASSWORD', 'Admin123!');
        $name = env('BOOTSTRAP_ADMIN_NAME', 'System Admin');

        User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => $password,
                'role' => 'admin',
                'status' => 'approved',
                'organization_id' => null,
            ]
        );
    }
}
