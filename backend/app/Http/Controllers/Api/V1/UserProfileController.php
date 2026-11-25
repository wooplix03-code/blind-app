<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserPreference;
use App\Models\UserProfile;
use App\Services\AiIntegrationService;
use Illuminate\Http\Request;

class UserProfileController extends Controller
{
    protected AiIntegrationService $aiService;

    public function __construct(AiIntegrationService $aiService)
    {
        $this->aiService = $aiService;
    }

    /**
     * Get user profile with voice description
     */
    public function getProfile(Request $request)
    {
        $user = $request->user()->load(['profile', 'preferences']);

        $name = $user->name;
        $phone = $user->phone_number ?? 'Not provided';
        $email = $user->email ?? 'Not provided';
        $spokenText = "Your profile. Name: {$name}. Phone number: {$phone}. Email address: {$email}. Swipe left to return to the main menu.";

        return response()->json([
            'success' => true,
            'user' => $user,
            'spoken_text' => $spokenText,
        ]);
    }

    /**
     * Update user profile via voice command or direct input
     */
    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone_number' => 'nullable|string|max:50',
            'bio' => 'nullable|string',
            'avatar_url' => 'nullable|string',
            'emergency_contact' => 'nullable|string',
            'address' => 'nullable|string',
        ]);

        $user = $request->user();

        if ($request->filled('name')) {
            $user->name = trim($request->name);
        }
        if ($request->filled('email')) {
            $user->email = trim($request->email);
        }
        if ($request->filled('phone_number')) {
            $user->phone_number = trim($request->phone_number);
        }
        $user->save();

        $profile = $user->profile ?? new UserProfile(['user_id' => $user->id]);
        if ($request->filled('bio')) $profile->bio = $request->bio;
        if ($request->filled('avatar_url')) $profile->avatar_url = $request->avatar_url;
        if ($request->filled('emergency_contact')) $profile->emergency_contact = $request->emergency_contact;
        if ($request->filled('address')) $profile->address = $request->address;
        $profile->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully.',
            'spoken_text' => 'Your profile has been updated successfully.',
            'user' => $user->fresh(['profile', 'preferences']),
        ]);
    }

    /**
     * Update language preference (e.g. "Please change to Malay language")
     */
    public function updateLanguage(Request $request)
    {
        $request->validate([
            'language_code' => 'required|string|max:10',
        ]);

        $code = strtolower(trim($request->language_code));
        $user = $request->user();
        $user->current_language = $code;
        $user->save();

        $langName = $this->aiService->translateLanguageName($code);

        return response()->json([
            'success' => true,
            'current_language' => $code,
            'language_name' => $langName,
            'message' => "Your preferred language has been changed to {$langName}.",
            'spoken_text' => "Your preferred language has been changed to {$langName}.",
        ]);
    }

    /**
     * Update speech preferences
     */
    public function updatePreferences(Request $request)
    {
        $request->validate([
            'speech_rate' => 'nullable|numeric|min:0.5|max:2.0',
            'speech_pitch' => 'nullable|numeric|min:0.5|max:2.0',
            'audio_cues_enabled' => 'nullable|boolean',
            'auto_read_posts' => 'nullable|boolean',
            'screen_reader_hints' => 'nullable|boolean',
        ]);

        $user = $request->user();
        $pref = $user->preferences ?? new UserPreference(['user_id' => $user->id]);

        if ($request->has('speech_rate')) $pref->speech_rate = $request->speech_rate;
        if ($request->has('speech_pitch')) $pref->speech_pitch = $request->speech_pitch;
        if ($request->has('audio_cues_enabled')) $pref->audio_cues_enabled = $request->audio_cues_enabled;
        if ($request->has('auto_read_posts')) $pref->auto_read_posts = $request->auto_read_posts;
        if ($request->has('screen_reader_hints')) $pref->screen_reader_hints = $request->screen_reader_hints;
        $pref->save();

        return response()->json([
            'success' => true,
            'message' => 'Preferences updated.',
            'preferences' => $pref,
        ]);
    }
}
