<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['detail' => 'Unauthenticated'], 401);
        }
        if ($user->isAdmin()) {
            return $next($request);
        }
        $org = $user->organization;
        if (! $org || ! $org->isSubscriptionActive()) {
            return response()->json([
                'detail' => 'Organization subscription is inactive or expired',
            ], 403);
        }

        return $next($request);
    }
}
