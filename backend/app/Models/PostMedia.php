<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PostMedia extends Model
{
    use HasFactory;

    protected $fillable = [
        'social_post_id',
        'file_path',
        'file_url',
        'media_type',
        'mime_type',
        'file_size',
        'blur_score',
        'quality_score',
    ];

    public function post()
    {
        return $this->belongsTo(SocialPost::class, 'social_post_id');
    }
}
