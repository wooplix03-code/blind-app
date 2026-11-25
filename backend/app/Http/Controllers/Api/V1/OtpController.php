<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\SmsOtpService;
use Illuminate\Http\Request;

class OtpController extends Controller
{
    protected SmsOtpService $otpService;

    public function __construct(SmsOtpService $otpService)
    {
        $this->otpService = $otpService;
    }

    public function sendOtp(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'purpose' => 'nullable|string',
        ]);

        $result = $this->otpService->sendOtp(
            $request->phone_number,
            $request->input('purpose', 'registration')
        );

        return response()->json($result);
    }

    public function verifyOtp(Request $request)
    {
        $request->validate([
            'phone_number' => 'required|string',
            'otp_code' => 'required|string',
            'purpose' => 'nullable|string',
        ]);

        $result = $this->otpService->verifyOtp(
            $request->phone_number,
            $request->otp_code,
            $request->input('purpose', 'registration')
        );

        return response()->json($result, $result['success'] ? 200 : 422);
    }
}
