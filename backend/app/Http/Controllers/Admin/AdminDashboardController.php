<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminUser;
use App\Models\AiUsageLog;
use App\Models\ApiIntegration;
use App\Models\AppSetting;
use App\Models\PostComment;
use App\Models\PostMedia;
use App\Models\PostReport;
use App\Models\SocialPost;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Models\UserLanguage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

class AdminDashboardController extends Controller
{
    /**
     * Show admin login page
     */
    public function showLogin()
    {
        if (session()->has('admin_id')) {
            return redirect()->route('admin.dashboard');
        }
        return view('admin.login');
    }

    /**
     * Handle admin login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $admin = AdminUser::where('email', $request->email)->first();

        if ($admin && Hash::check($request->password, $admin->password)) {
            session(['admin_id' => $admin->id, 'admin_name' => $admin->name, 'admin_email' => $admin->email]);
            return redirect()->route('admin.dashboard')->with('success', 'Welcome to Wezey Admin Portal.');
        }

        return back()->withErrors(['email' => 'Invalid email or password.']);
    }

    /**
     * Admin logout
     */
    public function logout()
    {
        session()->forget(['admin_id', 'admin_name', 'admin_email']);
        return redirect()->route('admin.login')->with('success', 'Logged out successfully.');
    }

    /**
     * Admin Dashboard Overview
     */
    public function index()
    {
        $this->ensureAuthenticated();

        $totalUsers = User::count();
        $activeUsers = User::where('is_active', true)->count();
        $totalPosts = SocialPost::count();
        $totalMedia = PostMedia::count();
        $newRegistrations = User::where('created_at', '>=', now()->subDays(7))->count();

        // AI Usage Metrics
        $totalAiRequests = AiUsageLog::count();
        $totalTokens = AiUsageLog::sum('total_tokens');
        $estimatedAiCost = AiUsageLog::sum('estimated_cost_usd');
        $aiErrors = AiUsageLog::where('status', 'error')->count();

        $recentActivities = UserActivityLog::with('user')->orderBy('id', 'desc')->take(10)->get();
        $recentUsers = User::with('profile')->orderBy('id', 'desc')->take(5)->get();
        $pendingReports = PostReport::with(['post.user', 'reportedBy'])->where('status', 'pending')->count();

        return view('admin.dashboard', compact(
            'totalUsers',
            'activeUsers',
            'totalPosts',
            'totalMedia',
            'newRegistrations',
            'totalAiRequests',
            'totalTokens',
            'estimatedAiCost',
            'aiErrors',
            'recentActivities',
            'recentUsers',
            'pendingReports'
        ));
    }

    /**
     * User Management
     */
    public function users(Request $request)
    {
        $this->ensureAuthenticated();

        $query = User::with(['profile', 'preferences'])->orderBy('id', 'desc');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone_number', 'like', "%{$search}%");
            });
        }

        $users = $query->paginate(15);
        return view('admin.users', compact('users'));
    }

    /**
     * Toggle User Active Status
     */
    public function toggleUserStatus($id)
    {
        $this->ensureAuthenticated();

        $user = User::findOrFail($id);
        $user->is_active = !$user->is_active;
        $user->save();

        $status = $user->is_active ? 'activated' : 'deactivated';
        return back()->with('success', "User '{$user->name}' {$status} successfully.");
    }

    /**
     * Social Media Management
     */
    public function posts(Request $request)
    {
        $this->ensureAuthenticated();

        $posts = SocialPost::with(['user', 'media', 'reports'])->orderBy('id', 'desc')->paginate(15);
        $reports = PostReport::with(['post.user', 'reportedBy'])->orderBy('id', 'desc')->paginate(15);

        return view('admin.posts', compact('posts', 'reports'));
    }

    /**
     * Delete Social Post (Moderation)
     */
    public function deletePost($id)
    {
        $this->ensureAuthenticated();

        $post = SocialPost::findOrFail($id);
        $post->delete();

        return back()->with('success', 'Social post removed by administrator.');
    }

    /**
     * Dismiss Post Report
     */
    public function dismissReport($id)
    {
        $this->ensureAuthenticated();

        $report = PostReport::findOrFail($id);
        $report->status = 'dismissed';
        $report->save();

        return back()->with('success', 'Report marked as dismissed.');
    }

    /**
     * AI Usage Monitoring
     */
    public function aiMonitoring()
    {
        $this->ensureAuthenticated();

        $logs = AiUsageLog::with('user')->orderBy('id', 'desc')->paginate(25);
        $totalRequests = AiUsageLog::count();
        $totalTokens = AiUsageLog::sum('total_tokens');
        $totalCost = AiUsageLog::sum('estimated_cost_usd');
        $chatRequests = AiUsageLog::where('feature', 'chat')->count();
        $visionRequests = AiUsageLog::whereIn('feature', ['vision_caption', 'visualization_qa'])->count();

        return view('admin.ai-monitoring', compact(
            'logs',
            'totalRequests',
            'totalTokens',
            'totalCost',
            'chatRequests',
            'visionRequests'
        ));
    }

    /**
     * Settings & Integrations
     */
    public function settings()
    {
        $this->ensureAuthenticated();

        $languages = UserLanguage::all();
        $integrations = ApiIntegration::all();
        $settings = AppSetting::all()->keyBy('key');

        return view('admin.settings', compact('languages', 'integrations', 'settings'));
    }

    /**
     * Save System Settings
     */
    public function saveSettings(Request $request)
    {
        $this->ensureAuthenticated();

        if ($request->filled('openai_api_key')) {
            AppSetting::set('openai_api_key', $request->openai_api_key, 'ai', 'OpenAI API Secret Key');
        }
        if ($request->filled('google_maps_api_key')) {
            AppSetting::set('google_maps_api_key', $request->google_maps_api_key, 'maps', 'Google Maps API Key');
        }
        if ($request->filled('openweather_api_key')) {
            AppSetting::set('openweather_api_key', $request->openweather_api_key, 'weather', 'OpenWeatherMap API Key');
        }
        if ($request->filled('twilio_sid')) {
            AppSetting::set('twilio_sid', $request->twilio_sid, 'sms', 'Twilio Account SID');
        }
        if ($request->filled('twilio_auth_token')) {
            AppSetting::set('twilio_auth_token', $request->twilio_auth_token, 'sms', 'Twilio Auth Token');
        }
        if ($request->filled('app_name')) {
            AppSetting::set('app_name', $request->app_name, 'general', 'Platform Name');
        }

        return back()->with('success', 'System settings saved successfully.');
    }

    protected function ensureAuthenticated()
    {
        if (!session()->has('admin_id')) {
            abort(redirect()->route('admin.login'));
        }
    }
}
