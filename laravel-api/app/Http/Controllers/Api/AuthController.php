<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeviceSession;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'max:128'],
            'full_name' => ['required', 'string', 'max:200'],
            'org_name' => ['nullable', 'string', 'max:200'],
        ]);

        $orgId = null;
        if (! empty($data['org_name'])) {
            $org = Organization::firstOrCreate(
                ['name' => trim($data['org_name'])],
                ['subscription_status' => 'inactive']
            );
            $orgId = $org->id;
        }

        User::create([
            'name' => trim($data['full_name']),
            'email' => strtolower(trim($data['email'])),
            'password' => $data['password'],
            'role' => 'user',
            'status' => 'pending',
            'organization_id' => $orgId,
        ]);

        return response()->json([
            'message' => 'Registration submitted. An admin must approve your account before login.',
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_id' => ['required', 'string', 'min:4', 'max:128'],
        ]);

        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password'],
            ]);
        }

        if ($user->status === 'pending') {
            return response()->json(['detail' => 'Account pending admin approval'], 403);
        }
        if ($user->status === 'rejected') {
            return response()->json(['detail' => 'Account was rejected'], 403);
        }
        if (! $user->isApproved()) {
            return response()->json(['detail' => "Account status is '{$user->status}'"], 403);
        }

        $days = (int) config('auth.token_days', env('AUTH_TOKEN_DAYS', 7));
        $expiresAt = now()->addDays($days);

        // One-device: revoke old sessions + Sanctum tokens
        DeviceSession::where('user_id', $user->id)->where('revoked', false)->update(['revoked' => true]);
        $user->tokens()->delete();

        $plainToken = $user->createToken('api', ['*'], $expiresAt)->plainTextToken;

        DeviceSession::create([
            'user_id' => $user->id,
            'device_id' => $data['device_id'],
            'token_hash' => hash('sha256', $plainToken),
            'expires_at' => $expiresAt,
            'revoked' => false,
        ]);

        $user->load('organization');

        return response()->json([
            'access_token' => $plainToken,
            'token_type' => 'bearer',
            'expires_at' => $expiresAt->toIso8601String(),
            'device_id' => $data['device_id'],
            'user' => $user->toPublicArray(true),
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        DeviceSession::where('user_id', $user->id)->update(['revoked' => true]);
        $user->currentAccessToken()?->delete();
        $user->tokens()->delete();

        return response()->json(['message' => 'Logged out. All sessions revoked.']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load('organization');

        return response()->json($user->toPublicArray(true));
    }

    public function forgotPassword(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $generic = 'If that email is registered, a password reset token has been issued.';
        $user = User::where('email', strtolower(trim($data['email'])))->first();
        if (! $user) {
            return response()->json(['message' => $generic, 'reset_token' => null]);
        }

        $raw = Str::random(48);
        DB::table('password_reset_tokens')->updateOrInsert(
            ['email' => $user->email],
            ['token' => Hash::make($raw), 'created_at' => now()]
        );

        // Demo: return token (wire SMTP later and stop returning it)
        return response()->json(['message' => $generic, 'reset_token' => $raw]);
    }

    public function resetPassword(Request $request)
    {
        $data = $request->validate([
            'token' => ['required', 'string'],
            'new_password' => ['required', 'string', 'min:8', 'max:128'],
            'email' => ['required', 'email'],
        ]);

        $row = DB::table('password_reset_tokens')->where('email', strtolower($data['email']))->first();
        if (! $row || ! Hash::check($data['token'], $row->token)) {
            return response()->json(['detail' => 'Invalid or used reset token'], 400);
        }
        if ($row->created_at && now()->diffInHours($row->created_at) > 1) {
            return response()->json(['detail' => 'Reset token expired'], 400);
        }

        $user = User::where('email', strtolower($data['email']))->firstOrFail();
        $user->password = $data['new_password'];
        $user->save();

        DB::table('password_reset_tokens')->where('email', $user->email)->delete();
        DeviceSession::where('user_id', $user->id)->update(['revoked' => true]);
        $user->tokens()->delete();

        return response()->json(['message' => 'Password updated. Please log in again.']);
    }
}
