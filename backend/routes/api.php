<?php

use App\Http\Controllers\Api\V1\AiAssistantController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\FaceVerificationController;
use App\Http\Controllers\Api\V1\FriendController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\OtpController;
use App\Http\Controllers\Api\V1\SocialFeedController;
use App\Http\Controllers\Api\V1\SystemConfigController;
use App\Http\Controllers\Api\V1\UserProfileController;
use App\Http\Controllers\Api\V1\WezeyWebNavigationController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| WEZEY ACCESSIBILITY & SOCIAL REST APIS (V1)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {

    // Rate-limited Auth & Registration Endpoints (Max 15 attempts / min)
    Route::middleware('throttle:15,1')->group(function () {
        Route::post('/auth/check', [AuthController::class, 'checkRegistered']);
        Route::post('/auth/register', [AuthController::class, 'voiceRegister']);
        Route::post('/auth/login', [AuthController::class, 'login']);
    });

    // Highly protected OTP Verification (Anti-bruteforce: Max 5 attempts / min)
    Route::middleware('throttle:5,1')->group(function () {
        Route::post('/otp/send', [OtpController::class, 'sendOtp']);
        Route::post('/otp/verify', [OtpController::class, 'verifyOtp']);
    });

    // Public System Config & Languages
    Route::get('/config', [SystemConfigController::class, 'appConfig']);
    Route::get('/languages', [SystemConfigController::class, 'languages']);
    Route::get('/system/openai-status', [SystemConfigController::class, 'getOpenAiStatus']);
    Route::post('/system/openai-key', [SystemConfigController::class, 'setOpenAiKey'])->middleware('throttle:10,1');

    // AI Assistant endpoints (Throttled: 30 requests / min)
    Route::middleware('throttle:30,1')->group(function () {
        Route::post('/ai/ask', [AiAssistantController::class, 'askQuestion']);
        Route::get('/ai/news', [AiAssistantController::class, 'breakingNews']);
        Route::get('/ai/weather', [AiAssistantController::class, 'weather']);
        Route::post('/ai/travel', [AiAssistantController::class, 'travelDuration']);
        Route::post('/ai/visualize', [AiAssistantController::class, 'visualizeSurroundings']);
        Route::post('/ai/visualize/ask', [AiAssistantController::class, 'visualizeContextualAsk']);
        Route::post('/ai/translate', [AiAssistantController::class, 'translate']);
    });

    // Website www.wezey.com Accessible Voice Navigation API
    Route::post('/wezey-web/navigate', [WezeyWebNavigationController::class, 'navigate']);
    Route::get('/wezey-web/sitemap', [WezeyWebNavigationController::class, 'sitemap']);

    // Public Feed Browsing (also available authenticated)
    Route::get('/feed', [SocialFeedController::class, 'index']);
    Route::get('/posts/{id}', [SocialFeedController::class, 'show']);
    Route::get('/posts/search/query', [SocialFeedController::class, 'search']);
    Route::get('/users/{userId}/album', [SocialFeedController::class, 'authorAlbum']);

    // Authenticated Endpoints (Sanctum protected)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/logout', [AuthController::class, 'logout']);

        // Profile & Preferences
        Route::get('/profile', [UserProfileController::class, 'getProfile']);
        Route::post('/profile/update', [UserProfileController::class, 'updateProfile']);
        Route::post('/profile/language', [UserProfileController::class, 'updateLanguage']);
        Route::post('/profile/preferences', [UserProfileController::class, 'updatePreferences']);

        // Face Biometrics
        Route::post('/face/enroll', [FaceVerificationController::class, 'enroll']);
        Route::post('/face/verify', [FaceVerificationController::class, 'verify']);

        // Social Post Creation, Likes, Comments, Reporting
        Route::post('/posts', [SocialFeedController::class, 'store']);
        Route::post('/posts/{id}/like', [SocialFeedController::class, 'like']);
        Route::post('/posts/{id}/comment', [SocialFeedController::class, 'comment']);
        Route::post('/posts/{id}/report', [SocialFeedController::class, 'report']);
        Route::get('/my-album', [SocialFeedController::class, 'authorAlbum']);
        Route::get('/users/search', [SystemConfigController::class, 'searchUsers']);

        // Friends & Connections
        Route::get('/friends', [FriendController::class, 'index']);
        Route::get('/friends/search', [FriendController::class, 'search']);
        Route::post('/friends/request', [FriendController::class, 'sendRequest']);
        Route::post('/friends/requests/{id}/accept', [FriendController::class, 'acceptRequest']);
        Route::post('/friends/requests/{id}/decline', [FriendController::class, 'declineRequest']);
        Route::delete('/friends/requests/{id}/cancel', [FriendController::class, 'cancelRequest']);
        Route::delete('/friends/{userId}', [FriendController::class, 'removeFriend']);

        // Notifications
        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    });
});

// Legacy / Direct Wezey website fallback routes
Route::get('/health', function () {
    return response()->json([
        'status' => 'healthy',
        'platform' => 'Wezey Accessibility Platform',
        'version' => '1.0.0',
        'timestamp' => now()->toIso8601String(),
    ]);
});
