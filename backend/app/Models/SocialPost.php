<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SocialPost extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'post_number',
        'caption',
        'ai_caption',
        'location_name',
        'latitude',
        'longitude',
        'media_url',
        'media_type',
        'likes_count',
        'comments_count',
        'is_public',
    ];

    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
        'likes_count' => 'integer',
        'comments_count' => 'integer',
        'is_public' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function media()
    {
        return $this->hasMany(PostMedia::class);
    }

    public function tags()
    {
        return $this->hasMany(PostTag::class);
    }

    public function likes()
    {
        return $this->hasMany(PostLike::class);
    }

    public function comments()
    {
        return $this->hasMany(PostComment::class);
    }

    public function reports()
    {
        return $this->hasMany(PostReport::class);
    }
}
