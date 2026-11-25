<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AdminRole extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
    ];

    public function admins()
    {
        return $this->hasMany(AdminUser::class, 'role_id');
    }

    public function permissions()
    {
        return $this->hasMany(AdminPermission::class, 'role_id');
    }
}
