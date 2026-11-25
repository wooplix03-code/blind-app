<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FaceVerification extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'biometric_token',
        'verification_status',
        'confidence_score',
        'metadata',
    ];

    protected $casts = [
        'confidence_score' => 'float',
        'metadata' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
