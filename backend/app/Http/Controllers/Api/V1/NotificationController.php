<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notification::with('actor.profile')
            ->where('user_id', $request->user()->id)
            ->orderBy('id', 'desc')
            ->take(30)
            ->get();

        $unreadCount = $notifications->where('is_read', false)->count();
        $spoken = "You have {$unreadCount} unread notification(s).";

        return response()->json([
            'success' => true,
            'unread_count' => $unreadCount,
            'spoken_text' => $spoken,
            'data' => $notifications,
        ]);
    }

    public function markAsRead(Request $request, $id)
    {
        $notif = Notification::where('user_id', $request->user()->id)->findOrFail($id);
        $notif->is_read = true;
        $notif->read_at = now();
        $notif->save();

        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read.',
        ]);
    }
}
