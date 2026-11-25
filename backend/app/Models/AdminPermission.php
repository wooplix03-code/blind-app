<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminPermission extends Model
{
    use HasFactory;

    protected $fillable = [
        'role_id',
        'permission_key',
    ];

    public function role()
    {
        return $this->belongsTo(AdminRole::class, 'role_id');
    }
}
