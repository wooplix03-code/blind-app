<?php

use App\Http\Controllers\Admin\AdminDashboardController;
use Illuminate\Support\Facades\Route;

// Redirect root to admin dashboard or welcome page
Route::get('/', function () {
    return redirect()->route('admin.dashboard');
});

Route::prefix('admin')->name('admin.')->group(function () {
    Route::get('/login', [AdminDashboardController::class, 'showLogin'])->name('login');
    Route::post('/login', [AdminDashboardController::class, 'login'])->name('login.submit');
    Route::post('/logout', [AdminDashboardController::class, 'logout'])->name('logout');

    Route::get('/', [AdminDashboardController::class, 'index'])->name('dashboard');
    Route::get('/users', [AdminDashboardController::class, 'users'])->name('users');
    Route::post('/users/{id}/toggle', [AdminDashboardController::class, 'toggleUserStatus'])->name('users.toggle');

    Route::get('/posts', [AdminDashboardController::class, 'posts'])->name('posts');
    Route::delete('/posts/{id}', [AdminDashboardController::class, 'deletePost'])->name('posts.delete');
    Route::post('/reports/{id}/dismiss', [AdminDashboardController::class, 'dismissReport'])->name('reports.dismiss');

    Route::get('/ai-monitoring', [AdminDashboardController::class, 'aiMonitoring'])->name('ai.monitoring');
    Route::get('/settings', [AdminDashboardController::class, 'settings'])->name('settings');
    Route::post('/settings', [AdminDashboardController::class, 'saveSettings'])->name('settings.save');
});
