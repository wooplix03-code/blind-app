<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\AiIntegrationService;
use App\Services\MediaStorageService;
use Illuminate\Http\Request;

class AiAssistantController extends Controller
{
    protected AiIntegrationService $aiService;
    protected MediaStorageService $storageService;

    public function __construct(AiIntegrationService $aiService, MediaStorageService $storageService)
    {
        $this->aiService = $aiService;
        $this->storageService = $storageService;
    }

    /**
     * General voice question handling
     */
    public function askQuestion(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'session_uuid' => 'nullable|string',
            'language' => 'nullable|string',
        ]);

        $userId = $request->user() ? $request->user()->id : null;
        $language = $request->input('language', $request->user()?->current_language ?? 'en');

        $result = $this->aiService->askQuestion(
            $userId,
            $request->question,
            $request->session_uuid,
            $language
        );

        return response()->json([
            'success' => true,
            ...$result,
        ]);
    }

    /**
     * Breaking News (top 5 stories)
     */
    public function breakingNews(Request $request)
    {
        $userId = $request->user() ? $request->user()->id : null;
        $country = $request->input('country', 'us');

        $news = $this->aiService->getBreakingNews($userId, $country);

        return response()->json([
            'success' => true,
            ...$news,
        ]);
    }

    /**
     * Current Weather
     */
    public function weather(Request $request)
    {
        $lat = $request->filled('latitude') ? (float)$request->latitude : null;
        $lon = $request->filled('longitude') ? (float)$request->longitude : null;
        $city = $request->input('city');

        $weather = $this->aiService->getWeather($lat, $lon, $city);

        return response()->json([
            'success' => true,
            ...$weather,
        ]);
    }

    /**
     * Travel Duration
     */
    public function travelDuration(Request $request)
    {
        $request->validate([
            'origin' => 'required|string',
            'destination' => 'required|string',
        ]);

        $travel = $this->aiService->getTravelDuration($request->origin, $request->destination);

        return response()->json([
            'success' => true,
            ...$travel,
        ]);
    }

    /**
     * AI Visualization: Describe surroundings from camera image (~20 words)
     */
    public function visualizeSurroundings(Request $request)
    {
        $request->validate([
            'image' => 'required', // image file or base64 data URL
            'session_uuid' => 'nullable|string',
        ]);

        $userId = $request->user() ? $request->user()->id : null;

        // Store image for accessibility conversation context
        $stored = $this->storageService->storeImage($request->image, 'visualization');

        $result = $this->aiService->describeSurroundings(
            $userId,
            $stored['file_url'],
            $request->session_uuid
        );

        return response()->json([
            'success' => true,
            'message' => 'Photo captured successfully.',
            ...$result,
        ]);
    }

    /**
     * AI Visualization: Contextual Question about the captured image
     */
    public function visualizeContextualAsk(Request $request)
    {
        $request->validate([
            'question' => 'required|string',
            'session_uuid' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
        ]);

        $userId = $request->user() ? $request->user()->id : null;

        $result = $this->aiService->askAboutImage(
            $userId,
            $request->question,
            $request->session_uuid,
            $request->latitude ? (float)$request->latitude : null,
            $request->longitude ? (float)$request->longitude : null
        );

        return response()->json([
            'success' => true,
            ...$result,
        ]);
    }

    /**
     * Voice Language Translation / Switching
     */
    public function translate(Request $request)
    {
        $request->validate([
            'target_language' => 'required|string',
        ]);

        $code = strtolower(trim($request->target_language));
        $langName = $this->aiService->translateLanguageName($code);

        if ($request->user()) {
            $user = $request->user();
            $user->current_language = $code;
            $user->save();
        }

        $spoken = "Your preferred language has been changed to {$langName}.";

        return response()->json([
            'success' => true,
            'language_code' => $code,
            'language_name' => $langName,
            'spoken_text' => $spoken,
        ]);
    }
}
