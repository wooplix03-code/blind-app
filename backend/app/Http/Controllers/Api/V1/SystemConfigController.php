<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\User;
use App\Models\UserLanguage;
use Illuminate\Http\Request;

class SystemConfigController extends Controller
{
    /**
     * List supported languages
     */
    public function languages()
    {
        $languages = UserLanguage::where('is_active', true)->get();
        return response()->json([
            'success' => true,
            'data' => $languages,
        ]);
    }

    /**
     * Search users for tagging in social posts
     */
    public function searchUsers(Request $request)
    {
        $query = trim($request->input('query', ''));
        $users = User::where('id', '!=', $request->user()?->id)
            ->where(function ($q) use ($query) {
                if (!empty($query)) {
                    $q->where('name', 'like', "%{$query}%")
                      ->orWhere('phone_number', 'like', "%{$query}%");
                }
            })
            ->take(10)
            ->get(['id', 'name', 'phone_number']);

        return response()->json([
            'success' => true,
            'users' => $users,
        ]);
    }

    /**
     * App configuration
     */
    public function appConfig()
    {
        return response()->json([
            'success' => true,
            'app_name' => 'Wezey',
            'version' => '1.0.0',
            'website_url' => 'https://www.wezey.com',
            'accessibility_features' => [
                'voice_first' => true,
                'global_gestures' => true,
                'screen_reader_optimizations' => true,
                'ai_scene_visualization' => true,
            ],
        ]);
    }

    /**
     * Get OpenAI configuration status
     */
    public function getOpenAiStatus()
    {
        $key = env('OPENAI_API_KEY', AppSetting::get('openai_api_key'));
        return response()->json([
            'success' => true,
            'configured' => !empty($key),
            'masked_key' => !empty($key) ? substr($key, 0, 7) . '...' . substr($key, -4) : null,
            'model' => env('OPENAI_MODEL', 'gpt-4o-mini'),
        ]);
    }

    /**
     * Set OpenAI API Key
     */
    public function setOpenAiKey(Request $request)
    {
        $request->validate([
            'api_key' => 'required|string',
        ]);
        AppSetting::set('openai_api_key', trim($request->api_key));
        return response()->json([
            'success' => true,
            'message' => 'OpenAI API key saved successfully.',
        ]);
    }
}
