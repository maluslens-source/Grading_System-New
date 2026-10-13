<?php

namespace App\Http\Middleware;

use App\Models\DeviceSession;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureDeviceSession
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['detail' => 'Unauthenticated'], 401);
        }

        if (! $user->isApproved()) {
            return response()->json(['detail' => "Account status is '{$user->status}'"], 403);
        }

        $deviceId = $request->header('X-Device-Id');
        if (! $deviceId) {
            return response()->json(['detail' => 'X-Device-Id header required'], 401);
        }

        $session = DeviceSession::query()
            ->where('user_id', $user->id)
            ->where('revoked', false)
            ->orderByDesc('id')
            ->first();

        if (! $session || ! $session->isValidFor($deviceId)) {
            return response()->json([
                'detail' => 'Session invalid or logged in on another device',
            ], 401);
        }

        $request->attributes->set('device_id', $deviceId);

        return $next($request);
    }
}
