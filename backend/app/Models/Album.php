<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Album extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'cover_url',
        'posts_count',
    ];

    protected $casts = [
        'posts_count' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function media()
    {
        return $this->hasMany(AlbumMedia::class);
    }

    public function posts()
    {
        return $this->belongsToMany(SocialPost::class, 'album_media', 'album_id', 'social_post_id')->withPivot('position')->withTimestamps();
    }
}
