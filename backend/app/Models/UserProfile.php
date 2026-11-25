<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserProfile extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'bio',
        'avatar_url',
        'emergency_contact',
        'address',
        'date_of_birth',
        'accessibility_mode',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
