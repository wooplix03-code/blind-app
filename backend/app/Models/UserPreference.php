<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserPreference extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'speech_rate',
        'speech_pitch',
        'voice_name',
        'screen_reader_hints',
        'gesture_sensitivity',
        'audio_cues_enabled',
        'auto_read_posts',
    ];

    protected $casts = [
        'speech_rate' => 'float',
        'speech_pitch' => 'float',
        'screen_reader_hints' => 'boolean',
        'audio_cues_enabled' => 'boolean',
        'auto_read_posts' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
