<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Friendship extends Model
{
    use HasFactory;

    protected $fillable = [
        'requester_id',
        'addressee_id',
        'status',
        'accepted_at',
    ];

    protected function casts(): array
    {
        return [
            'accepted_at' => 'datetime',
        ];
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    public function addressee()
    {
        return $this->belongsTo(User::class, 'addressee_id');
    }

    /**
     * Get accepted friend user IDs for a given user.
     *
     * @return array<int, int>
     */
    public static function acceptedFriendIdsFor(int $userId): array
    {
        $rows = self::where('status', 'accepted')
            ->where(function ($q) use ($userId) {
                $q->where('requester_id', $userId)
                  ->orWhere('addressee_id', $userId);
            })
            ->get(['requester_id', 'addressee_id']);

        $ids = [];
        foreach ($rows as $row) {
            $ids[] = $row->requester_id === $userId ? (int) $row->addressee_id : (int) $row->requester_id;
        }

        return array_values(array_unique($ids));
    }

    /**
     * Inspect relationship status between current user and another user.
     *
     * @return array{status: string, friendship_id: ?int}
     */
    public static function relationshipBetween(int $userId, int $otherUserId): array
    {
        if ($userId === $otherUserId) {
            return ['status' => 'self', 'friendship_id' => null];
        }

        $row = self::where(function ($q) use ($userId, $otherUserId) {
            $q->where('requester_id', $userId)->where('addressee_id', $otherUserId);
        })->orWhere(function ($q) use ($userId, $otherUserId) {
            $q->where('requester_id', $otherUserId)->where('addressee_id', $userId);
        })->first();

        if (!$row || $row->status === 'declined') {
            return ['status' => 'none', 'friendship_id' => $row?->id];
        }

        if ($row->status === 'accepted') {
            return ['status' => 'accepted', 'friendship_id' => $row->id];
        }

        return [
            'status' => $row->requester_id === $userId ? 'pending_sent' : 'pending_received',
            'friendship_id' => $row->id,
        ];
    }

    /**
     * Compute mutual friends (IDs + display names) against pre-fetched friend IDs.
     *
     * @param array<int, int> $myFriendIds
     * @return array{count: int, names: array<int, string>}
     */
    public static function mutualFriendsBetween(int $userId, int $otherUserId, array $myFriendIds): array
    {
        if ($userId === $otherUserId || empty($myFriendIds)) {
            return ['count' => 0, 'names' => []];
        }

        $theirIds = self::acceptedFriendIdsFor($otherUserId);
        $mutualIds = array_values(array_intersect($myFriendIds, $theirIds));

        if (empty($mutualIds)) {
            return ['count' => 0, 'names' => []];
        }

        $names = User::whereIn('id', $mutualIds)
            ->orderBy('name')
            ->pluck('name')
            ->take(5)
            ->values()
            ->all();

        return [
            'count' => count($mutualIds),
            'names' => $names,
        ];
    }
}
