<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\FaceVerificationService;
use Illuminate\Http\Request;

class FaceVerificationController extends Controller
{
    protected FaceVerificationService $faceService;

    public function __construct(FaceVerificationService $faceService)
    {
        $this->faceService = $faceService;
    }

    public function enroll(Request $request)
    {
        $request->validate([
            'image_data' => 'nullable|string',
        ]);

        $result = $this->faceService->enrollFace($request->user(), $request->image_data);

        return response()->json($result);
    }

    public function verify(Request $request)
    {
        $request->validate([
            'image_data' => 'nullable|string',
        ]);

        $result = $this->faceService->verifyFace($request->user(), $request->image_data);

        return response()->json($result, $result['matched'] ? 200 : 422);
    }
}
