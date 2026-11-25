<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AlbumMedia extends Model
{
    use HasFactory;

    protected $table = 'album_media';

    protected $fillable = [
        'album_id',
        'social_post_id',
        'position',
    ];

    public function album()
    {
        return $this->belongsTo(Album::class);
    }

    public function post()
    {
        return $this->belongsTo(SocialPost::class, 'social_post_id');
    }
}
