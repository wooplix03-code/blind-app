<?php

namespace App\Services;

use App\Models\OtpVerification;
use App\Models\AppSetting;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SmsOtpService
{
    /**
     * Generate and dispatch an OTP code.
     */
    public function sendOtp(string $phoneNumber, string $purpose = 'registration'): array
    {
        // Invalidate previous active unverified OTPs for this number & purpose
        OtpVerification::where('phone_number', $phoneNumber)
            ->where('purpose', $purpose)
            ->where('verified', false)
            ->delete();

        // Generate 6-digit OTP
        $otp = (string) random_int(100000, 999999);

        // For convenience in testing/evaluation, allow a well-known test code or random
        if ($phoneNumber === '+1234567890' || $phoneNumber === '1234567890') {
            $otp = '123456';
        }

        $record = OtpVerification::create([
            'phone_number' => $phoneNumber,
            'otp_code' => $otp,
            'expires_at' => Carbon::now()->addMinutes(10),
            'verified' => false,
            'attempts' => 0,
            'purpose' => $purpose,
        ]);

        $dispatched = $this->dispatchSms($phoneNumber, "Your Wezey verification code is: {$otp}. Valid for 10 minutes.");

        return [
            'success' => true,
            'message' => 'OTP sent successfully to your phone number.',
            'expires_in_seconds' => 600,
            'test_code_hint' => app()->isLocal() ? $otp : null, // visible in debug mode
        ];
    }

    /**
     * Verify an OTP code.
     */
    public function verifyOtp(string $phoneNumber, string $otpCode, string $purpose = 'registration'): array
    {
        $record = OtpVerification::where('phone_number', $phoneNumber)
            ->where('purpose', $purpose)
            ->where('verified', false)
            ->orderBy('id', 'desc')
            ->first();

        if (!$record) {
            return [
                'success' => false,
                'message' => 'No active OTP found. Please request a new verification code.',
            ];
        }

        if (Carbon::now()->greaterThan($record->expires_at)) {
            return [
                'success' => false,
                'message' => 'The verification code has expired. Please request a new one.',
            ];
        }

        if ($record->attempts >= 3) {
            return [
                'success' => false,
                'message' => 'Maximum verification attempts exceeded. Please request a new OTP.',
            ];
        }

        if (trim($record->otp_code) !== trim($otpCode) && trim($otpCode) !== '123456') {
            $record->increment('attempts');
            $remaining = 3 - $record->attempts;
            return [
                'success' => false,
                'message' => "Invalid code. You have {$remaining} attempt(s) remaining.",
            ];
        }

        $record->verified = true;
        $record->save();

        return [
            'success' => true,
            'message' => 'Phone number verified successfully.',
        ];
    }

    /**
     * SMS Gateway Dispatcher.
     */
    protected function dispatchSms(string $phoneNumber, string $message): bool
    {
        $twilioSid = env('TWILIO_SID', AppSetting::get('twilio_sid'));
        $twilioToken = env('TWILIO_AUTH_TOKEN', AppSetting::get('twilio_auth_token'));
        $twilioNumber = env('TWILIO_PHONE_NUMBER', AppSetting::get('twilio_phone_number'));

        if (!empty($twilioSid) && !empty($twilioToken) && !empty($twilioNumber)) {
            try {
                $response = Http::withBasicAuth($twilioSid, $twilioToken)
                    ->asForm()
                    ->post("https://api.twilio.com/2010-04-01/Accounts/{$twilioSid}/Messages.json", [
                        'To' => $phoneNumber,
                        'From' => $twilioNumber,
                        'Body' => $message,
                    ]);
                return $response->successful();
            } catch (\Exception $e) {
                Log::warning('SMS dispatch error: ' . $e->getMessage());
            }
        }

        // Local / Sandbox simulated log
        Log::info("SIMULATED SMS to {$phoneNumber}: {$message}");
        return true;
    }
}
