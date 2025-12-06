<?php

use App\Http\Controllers\FeedbackController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\IntegrationController;
use App\Http\Controllers\HealthController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public routes
Route::get('/v1/healthz', [HealthController::class, 'healthz']);

// Authenticated routes with /v1 prefix
Route::prefix('v1')->middleware(['auth.jwt'])->group(function () {
    // Feedback CRUD
    Route::post('/feedback', [FeedbackController::class, 'create']);
    Route::get('/feedback', [FeedbackController::class, 'list']);
    Route::get('/feedback/{id}', [FeedbackController::class, 'show']);
    Route::post('/feedback/{id}/messages', [FeedbackController::class, 'addMessage']);

    // Admin-only routes
    Route::middleware(['role:ADMIN'])->group(function () {
        Route::patch('/feedback/{id}', [FeedbackController::class, 'update']);
        Route::post('/feedback/{id}/analyze', [IntegrationController::class, 'analyzeFeedback']);
        Route::get('/exports/feedback.csv', [ExportController::class, 'exportCsv']);
        Route::post('/integrations/teams/notify', [IntegrationController::class, 'sendTeamsNotification']);
    });
});

