<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\UserProfile;
use App\Models\UserPreference;
use App\Models\UserActivityLog;
use App\Services\FaceVerificationService;
use App\Services\SmsOtpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    protected SmsOtpService $otpService;
    protected FaceVerificationService $faceService;

    public function __construct(SmsOtpService $otpService, FaceVerificationService $faceService)
    {
        $this->otpService = $otpService;
        $this->faceService = $faceService;
    }

    /**
     * Check if a phone number or device is already registered.
     */
    public function checkRegistered(Request $request)
    {
        $request->validate([
            'phone_number' => 'nullable|string',
        ]);

        $phoneNumber = $request->input('phone_number');
        if (empty($phoneNumber)) {
            return response()->json([
                'registered' => false,
                'message' => 'Please register yourself for the first time to proceed.',
                'spoken_text' => 'Please register yourself for the first time to proceed.',
            ]);
        }

        $user = User::where('phone_number', $phoneNumber)->first();

        if ($user) {
            $token = $user->createToken('wezey_mobile_app')->plainTextToken;
            return response()->json([
                'registered' => true,
                'message' => 'Welcome back to Wezey.',
                'spoken_text' => 'Welcome back to Wezey. Main Menu.',
                'token' => $token,
                'user' => $user->load(['profile', 'preferences']),
            ]);
        }

        return response()->json([
            'registered' => false,
            'message' => 'Please register yourself for the first time to proceed.',
            'spoken_text' => 'Please register yourself for the first time to proceed.',
        ]);
    }

    /**
     * Voice-based Registration completion.
     */
    public function voiceRegister(Request $request)
    {
        // Normalize phone_number spacing before validation/storage
        if ($request->filled('phone_number')) {
            $normalizedPhone = preg_replace('/[^\d+]/', '', (string) $request->input('phone_number'));
            $request->merge(['phone_number' => $normalizedPhone]);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'phone_number' => 'required|string|max:50|unique:users,phone_number',
            'email' => 'nullable|email|max:255|unique:users,email',
            'face_data' => 'nullable|string',
            'otp_code' => 'nullable|string',
            'device_type' => 'nullable|string',
        ]);

        // If OTP is provided, verify it (or accept demo default)
        if ($request->filled('otp_code')) {
            $otpRes = $this->otpService->verifyOtp($request->phone_number, $request->otp_code);
            if (!$otpRes['success'] && $request->otp_code !== '123456') {
                return response()->json([
                    'success' => false,
                    'message' => $otpRes['message'],
                    'spoken_text' => $otpRes['message'],
                ], 422);
            }
        }

        // Create User
        $user = User::create([
            'name' => trim($request->name),
            'phone_number' => trim($request->phone_number),
            'email' => $request->filled('email') ? strtolower(trim($request->email)) : null,
            'password' => Hash::make(Str::random(32)),
            'current_language' => 'en',
            'phone_verified_at' => now(),
            'is_active' => true,
        ]);

        // Use captured camera face snapshot as avatar if provided
        $faceData = $request->input('face_data');
        $avatarUrl = (is_string($faceData) && str_starts_with($faceData, 'data:image/'))
            ? $faceData
            : null;

        // Create User Profile
        UserProfile::create([
            'user_id' => $user->id,
            'avatar_url' => $avatarUrl,
            'accessibility_mode' => 'voice_first',
        ]);

        // Create User Preferences
        UserPreference::create([
            'user_id' => $user->id,
            'speech_rate' => 1.0,
            'speech_pitch' => 1.0,
            'audio_cues_enabled' => true,
            'auto_read_posts' => true,
            'screen_reader_hints' => true,
        ]);

        // Enroll Face if provided
        if ($request->filled('face_data')) {
            $this->faceService->enrollFace($user, $request->face_data);
        }

        // Generate Sanctum token
        $token = $user->createToken('wezey_mobile_app')->plainTextToken;

        // Log Activity
        UserActivityLog::create([
            'user_id' => $user->id,
            'action' => 'register',
            'ip_address' => $request->ip(),
            'details' => ['method' => 'voice_registration'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Account registration completed.',
            'spoken_text' => 'Account registration completed. Welcome to Wezey Main Menu.',
            'token' => $token,
            'user' => $user->load(['profile', 'preferences']),
        ], 201);
    }

    /**
     * Standard Login
     */
    public function login(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'password' => 'nullable|string',
            'otp_code' => 'nullable|string',
        ]);

        $rawPhone = trim((string) $request->phone_number);
        $normalizedPhone = preg_replace('/[^\d+]/', '', $rawPhone);

        $user = User::where('phone_number', $rawPhone)
            ->orWhere('phone_number', $normalizedPhone)
            ->first();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Account not found for this phone number. Please register first.',
                'spoken_text' => 'Account not found. Please register yourself to proceed.',
            ], 404);
        }

        if (!$user->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Account has been deactivated. Please contact support.',
                'spoken_text' => 'Account has been deactivated. Please contact support.',
            ], 403);
        }

        // Verify OTP if provided (supports real OTP records or documented demo OTP 123456)
        if ($request->filled('otp_code')) {
            $otp = trim((string) $request->otp_code);
            if ($otp !== '123456') {
                $otpRes = $this->otpService->verifyOtp($user->phone_number, $otp, 'login');
                if (!$otpRes['success']) {
                    return response()->json([
                        'success' => false,
                        'message' => $otpRes['message'],
                        'spoken_text' => $otpRes['message'],
                    ], 422);
                }
            }
        }

        $token = $user->createToken('wezey_mobile_app')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Logged in successfully.',
            'spoken_text' => 'Welcome to Wezey. Main Menu.',
            'token' => $token,
            'user' => $user->load(['profile', 'preferences']),
        ]);
    }

    /**
     * Log out
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
            'spoken_text' => 'You have logged out of Wezey.',
        ]);
    }

    /**
     * Get authenticated user
     */
    public function me(Request $request)
    {
        return response()->json([
            'success' => true,
            'user' => $request->user()->load(['profile', 'preferences']),
        ]);
    }
}
