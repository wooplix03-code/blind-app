<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Friendship;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Http\Request;

class FriendController extends Controller
{
    /**
     * Format a user card consistently with relationship, mutual friends, and voice summary.
     */
    private function formatPerson(User $person, int $meId, array $myFriendIds): array
    {
        $rel = Friendship::relationshipBetween($meId, (int) $person->id);
        $mutual = Friendship::mutualFriendsBetween($meId, (int) $person->id, $myFriendIds);
        $postsCount = (int) ($person->posts_count ?? $person->posts()->count());

        $mutualLabel = $mutual['count'] > 0
            ? ($mutual['count'] === 1
                ? "1 mutual friend: {$mutual['names'][0]}"
                : "{$mutual['count']} mutual friends including " . implode(', ', array_slice($mutual['names'], 0, 2)))
            : 'No mutual friends yet';

        return [
            'id' => $person->id,
            'name' => $person->name,
            'initial' => strtoupper(mb_substr(trim((string) $person->name), 0, 1)) ?: 'U',
            'phone_number' => $person->phone_number,
            'bio' => $person->profile?->bio,
            'avatar_url' => $person->profile?->avatar_url,
            'posts_count' => $postsCount,
            'friendship_status' => $rel['status'],
            'friendship_id' => $rel['friendship_id'],
            'mutual_count' => $mutual['count'],
            'mutual_names' => $mutual['names'],
            'spoken_summary' => "{$person->name}. {$mutualLabel}. {$postsCount} post" . ($postsCount === 1 ? '' : 's') . '.',
        ];
    }

    /**
     * Get full friends hub state: accepted friends, incoming requests, sent requests, and suggestions.
     */
    public function index(Request $request)
    {
        $me = $request->user();
        $myFriendIds = Friendship::acceptedFriendIdsFor($me->id);

        $friends = empty($myFriendIds)
            ? collect()
            : User::with('profile')
                ->withCount('posts')
                ->whereIn('id', $myFriendIds)
                ->where('is_active', true)
                ->orderBy('name')
                ->get()
                ->map(fn ($u) => $this->formatPerson($u, $me->id, $myFriendIds))
                ->values();

        $incomingRows = Friendship::with(['requester.profile'])
            ->where('addressee_id', $me->id)
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get();

        $incoming = $incomingRows
            ->filter(fn ($r) => $r->requester && $r->requester->is_active)
            ->map(function ($row) use ($me, $myFriendIds) {
                $person = $this->formatPerson($row->requester, $me->id, $myFriendIds);
                $person['friendship_id'] = $row->id;
                $person['requested_at_human'] = $row->created_at?->diffForHumans() ?? 'recently';
                $mutualHint = $person['mutual_count'] > 0
                    ? "{$person['mutual_count']} mutual friend" . ($person['mutual_count'] === 1 ? '' : 's')
                    : 'No mutual friends';
                $person['spoken_prompt'] = "Friend request from {$person['name']}. {$mutualHint}. Tap Accept or Decline.";
                return $person;
            })
            ->values();

        $sentRows = Friendship::with(['addressee.profile'])
            ->where('requester_id', $me->id)
            ->where('status', 'pending')
            ->orderByDesc('id')
            ->get();

        $sent = $sentRows
            ->filter(fn ($r) => $r->addressee && $r->addressee->is_active)
            ->map(function ($row) use ($me, $myFriendIds) {
                $person = $this->formatPerson($row->addressee, $me->id, $myFriendIds);
                $person['friendship_id'] = $row->id;
                $person['requested_at_human'] = $row->created_at?->diffForHumans() ?? 'recently';
                return $person;
            })
            ->values();

        $excludeIds = array_unique(array_merge(
            [$me->id],
            $myFriendIds,
            $incomingRows->pluck('requester_id')->all(),
            $sentRows->pluck('addressee_id')->all()
        ));

        $suggestions = User::with('profile')
            ->withCount('posts')
            ->where('is_active', true)
            ->whereNotIn('id', $excludeIds)
            ->orderByDesc('id')
            ->take(20)
            ->get()
            ->map(fn ($u) => $this->formatPerson($u, $me->id, $myFriendIds))
            ->values();

        $spokenText = "Friends page. You have {$friends->count()} friend" . ($friends->count() === 1 ? '' : 's')
            . " and {$incoming->count()} pending friend request" . ($incoming->count() === 1 ? '' : 's') . '.';

        return response()->json([
            'success' => true,
            'spoken_text' => $spokenText,
            'counts' => [
                'friends' => $friends->count(),
                'incoming' => $incoming->count(),
                'sent' => $sent->count(),
            ],
            'friends' => $friends,
            'incoming_requests' => $incoming,
            'sent_requests' => $sent,
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Search Wezey users by name, phone, or email with live friendship status.
     */
    public function search(Request $request)
    {
        $me = $request->user();
        $query = trim((string) $request->input('query', ''));
        $myFriendIds = Friendship::acceptedFriendIdsFor($me->id);

        $users = User::with('profile')
            ->withCount('posts')
            ->where('is_active', true)
            ->where('id', '!=', $me->id)
            ->when($query !== '', function ($q) use ($query) {
                $q->where(function ($sub) use ($query) {
                    $sub->where('name', 'like', "%{$query}%")
                        ->orWhere('phone_number', 'like', "%{$query}%")
                        ->orWhere('email', 'like', "%{$query}%");
                });
            })
            ->orderBy('name')
            ->take(20)
            ->get()
            ->map(fn ($u) => $this->formatPerson($u, $me->id, $myFriendIds))
            ->values();

        $spoken = $users->isEmpty()
            ? "No people found matching {$query}."
            : "Found {$users->count()} person" . ($users->count() === 1 ? '' : 's') . ($query ? " matching {$query}." : '.');

        return response()->json([
            'success' => true,
            'spoken_text' => $spoken,
            'users' => $users,
        ]);
    }

    /**
     * Send a friend request (or auto-accept if they already sent one to us).
     */
    public function sendRequest(Request $request)
    {
        $request->validate([
            'user_id' => 'required|integer|exists:users,id',
        ]);

        $me = $request->user();
        $target = User::findOrFail((int) $request->input('user_id'));

        if ($target->id === $me->id) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot add yourself as a friend.',
            ], 422);
        }

        $existing = Friendship::where(function ($q) use ($me, $target) {
            $q->where('requester_id', $me->id)->where('addressee_id', $target->id);
        })->orWhere(function ($q) use ($me, $target) {
            $q->where('requester_id', $target->id)->where('addressee_id', $me->id);
        })->first();

        if ($existing) {
            if ($existing->status === 'accepted') {
                return response()->json([
                    'success' => false,
                    'message' => "You are already friends with {$target->name}.",
                ], 422);
            }

            if ($existing->status === 'pending') {
                if ($existing->requester_id === $me->id) {
                    return response()->json([
                        'success' => true,
                        'friendship' => $existing,
                        'friendship_status' => 'pending_sent',
                        'message' => "Friend request already sent to {$target->name}.",
                        'spoken_text' => "Friend request already pending with {$target->name}.",
                    ]);
                }

                // Target already requested us — mutual consent accepts immediately
                $existing->status = 'accepted';
                $existing->accepted_at = now();
                $existing->save();

                Notification::create([
                    'user_id' => $target->id,
                    'actor_id' => $me->id,
                    'type' => 'friend_accepted',
                    'title' => 'Friend Request Accepted',
                    'message' => "{$me->name} accepted your friend request.",
                    'data' => ['friendship_id' => $existing->id],
                    'is_read' => false,
                ]);

                return response()->json([
                    'success' => true,
                    'friendship' => $existing,
                    'friendship_status' => 'accepted',
                    'message' => "You and {$target->name} are now friends!",
                    'spoken_text' => "You and {$target->name} are now friends.",
                ]);
            }

            // Re-open previously declined request in current user's direction
            $existing->requester_id = $me->id;
            $existing->addressee_id = $target->id;
            $existing->status = 'pending';
            $existing->accepted_at = null;
            $existing->save();
            $friendship = $existing;
        } else {
            $friendship = Friendship::create([
                'requester_id' => $me->id,
                'addressee_id' => $target->id,
                'status' => 'pending',
            ]);
        }

        Notification::create([
            'user_id' => $target->id,
            'actor_id' => $me->id,
            'type' => 'friend_request',
            'title' => 'New Friend Request',
            'message' => "{$me->name} sent you a friend request.",
            'data' => ['friendship_id' => $friendship->id],
            'is_read' => false,
        ]);

        return response()->json([
            'success' => true,
            'friendship' => $friendship,
            'friendship_status' => 'pending_sent',
            'message' => "Friend request sent to {$target->name}.",
            'spoken_text' => "Friend request sent to {$target->name}.",
        ], 201);
    }

    /**
     * Accept an incoming friend request.
     */
    public function acceptRequest(Request $request, $id)
    {
        $me = $request->user();
        $friendship = Friendship::with('requester')
            ->where('id', $id)
            ->where('addressee_id', $me->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $friendship->status = 'accepted';
        $friendship->accepted_at = now();
        $friendship->save();

        Notification::create([
            'user_id' => $friendship->requester_id,
            'actor_id' => $me->id,
            'type' => 'friend_accepted',
            'title' => 'Friend Request Accepted',
            'message' => "{$me->name} accepted your friend request.",
            'data' => ['friendship_id' => $friendship->id],
            'is_read' => false,
        ]);

        $requesterName = $friendship->requester?->name ?? 'User';

        return response()->json([
            'success' => true,
            'friendship' => $friendship,
            'friendship_status' => 'accepted',
            'message' => "You are now friends with {$requesterName}.",
            'spoken_text' => "Accepted. You are now friends with {$requesterName}.",
        ]);
    }

    /**
     * Decline an incoming friend request.
     */
    public function declineRequest(Request $request, $id)
    {
        $me = $request->user();
        $friendship = Friendship::with('requester')
            ->where('id', $id)
            ->where('addressee_id', $me->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $friendship->status = 'declined';
        $friendship->save();

        $requesterName = $friendship->requester?->name ?? 'User';

        return response()->json([
            'success' => true,
            'message' => "Friend request from {$requesterName} declined.",
            'spoken_text' => "Declined friend request from {$requesterName}.",
        ]);
    }

    /**
     * Cancel an outgoing pending friend request.
     */
    public function cancelRequest(Request $request, $id)
    {
        $me = $request->user();
        $friendship = Friendship::with('addressee')
            ->where('id', $id)
            ->where('requester_id', $me->id)
            ->where('status', 'pending')
            ->firstOrFail();

        $targetName = $friendship->addressee?->name ?? 'User';
        $friendship->delete();

        return response()->json([
            'success' => true,
            'message' => "Friend request to {$targetName} cancelled.",
            'spoken_text' => "Cancelled friend request to {$targetName}.",
        ]);
    }

    /**
     * Remove an existing friend.
     */
    public function removeFriend(Request $request, $userId)
    {
        $me = $request->user();
        $otherId = (int) $userId;

        $friendship = Friendship::where('status', 'accepted')
            ->where(function ($q) use ($me, $otherId) {
                $q->where(function ($sub) use ($me, $otherId) {
                    $sub->where('requester_id', $me->id)->where('addressee_id', $otherId);
                })->orWhere(function ($sub) use ($me, $otherId) {
                    $sub->where('requester_id', $otherId)->where('addressee_id', $me->id);
                });
            })
            ->firstOrFail();

        $friendship->delete();

        return response()->json([
            'success' => true,
            'message' => 'Removed from your friends list.',
            'spoken_text' => 'Removed from friends list.',
        ]);
    }
}
