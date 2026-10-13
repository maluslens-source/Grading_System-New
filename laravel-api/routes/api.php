<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\JobController;
use App\Http\Middleware\EnsureAdmin;
use App\Http\Middleware\EnsureDeviceSession;
use App\Http\Middleware\EnsureSubscription;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'service' => 'laravel-api',
            'python_ml_url' => config('services.python_ml.url'),
        ]);
    });

    // Auth (public)
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/auth/reset-password', [AuthController::class, 'resetPassword']);

    // Auth (protected + one-device)
    Route::middleware(['auth:sanctum', EnsureDeviceSession::class])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        // Jobs — subscription required (admin bypass inside middleware)
        Route::middleware([EnsureSubscription::class])->group(function () {
            Route::post('/jobs/submit', [JobController::class, 'submit']);
            Route::post('/jobs/{id}/process', [JobController::class, 'process']);
            Route::post('/jobs/{id}/retry', [JobController::class, 'retry']);
        });

        Route::get('/jobs', [JobController::class, 'index']);
        Route::get('/jobs/{id}/status', [JobController::class, 'status']);
        Route::get('/jobs/{id}/results', [JobController::class, 'results']);

        // Admin
        Route::middleware([EnsureAdmin::class])->prefix('admin')->group(function () {
            Route::get('/users/pending', [AdminController::class, 'pendingUsers']);
            Route::get('/users', [AdminController::class, 'listUsers']);
            Route::post('/users/{id}/approval', [AdminController::class, 'approveUser']);
            Route::patch('/users/{id}', [AdminController::class, 'updateUser']);
            Route::post('/organizations', [AdminController::class, 'createOrganization']);
            Route::get('/organizations', [AdminController::class, 'listOrganizations']);
            Route::get('/organizations/{id}', [AdminController::class, 'getOrganization']);
            Route::post('/organizations/{id}/subscription', [AdminController::class, 'setSubscription']);
        });
    });
});
