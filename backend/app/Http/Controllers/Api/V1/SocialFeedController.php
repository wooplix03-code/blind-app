<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Album;
use App\Models\AlbumMedia;
use App\Models\Friendship;
use App\Models\Notification;
use App\Models\PostComment;
use App\Models\PostLike;
use App\Models\PostMedia;
use App\Models\PostReport;
use App\Models\PostTag;
use App\Models\SocialPost;
use App\Models\User;
use App\Services\AiIntegrationService;
use App\Services\MediaStorageService;
use Illuminate\Http\Request;

class SocialFeedController extends Controller
{
    protected AiIntegrationService $aiService;
    protected MediaStorageService $storageService;

    public function __construct(AiIntegrationService $aiService, MediaStorageService $storageService)
    {
        $this->aiService = $aiService;
        $this->storageService = $storageService;
    }

    /**
     * Social Feed list
     */
    public function index(Request $request)
    {
        $viewer = auth('sanctum')->user() ?? $request->user();
        $scope = $request->input('scope', 'all');
        $myFriendIds = $viewer ? Friendship::acceptedFriendIdsFor($viewer->id) : [];

        $query = SocialPost::with(['user.profile', 'media', 'tags.user', 'comments.user.profile'])
            ->where('is_public', true);

        if ($viewer && $scope === 'friends') {
            $visibleUserIds = array_values(array_unique(array_merge([$viewer->id], $myFriendIds)));
            $query->whereIn('user_id', $visibleUserIds);
        }

        $posts = $query->orderBy('id', 'desc')
            ->paginate($request->input('per_page', 15));

        $likedSet = $viewer
            ? PostLike::where('user_id', $viewer->id)
                ->whereIn('social_post_id', collect($posts->items())->pluck('id'))
                ->pluck('social_post_id')
                ->flip()
                ->all()
            : [];

        $incomingPendingCount = $viewer
            ? Friendship::where('addressee_id', $viewer->id)->where('status', 'pending')->count()
            : 0;

        $feedAuthorName = $viewer ? $viewer->name : 'Wezey';
        $introSpeech = "{$feedAuthorName}'s Social Feed. Scroll down to browse more posts and swipe right to open the album.";

        $relCache = [];

        // Format posts with synthesized spoken captions & relationship state
        $items = collect($posts->items())->map(function ($post) use ($viewer, $likedSet, &$relCache) {
            $author = $post->user->name ?? 'Community Member';
            $caption = $post->caption ?: ($post->ai_caption ?: 'A shared photo');
            $post->spoken_narration = "{$author} posted: {$caption}";
            $post->formatted_date = $post->created_at->diffForHumans();
            $post->liked_by_me = isset($likedSet[$post->id]);

            if ($viewer) {
                $authorId = (int) $post->user_id;
                if (!isset($relCache[$authorId])) {
                    $relCache[$authorId] = Friendship::relationshipBetween($viewer->id, $authorId);
                }
                $post->friend_status = $relCache[$authorId]['status'];
                $post->friendship_id = $relCache[$authorId]['friendship_id'];
            } else {
                $post->friend_status = 'none';
                $post->friendship_id = null;
            }

            if ($post->relationLoaded('comments')) {
                $post->comments->transform(function ($comment) {
                    $comment->formatted_date = $comment->created_at?->diffForHumans() ?? 'recently';
                    return $comment;
                });
            }

            return $post;
        });

        return response()->json([
            'success' => true,
            'scope' => $scope,
            'intro_speech' => $introSpeech,
            'friends_count' => count($myFriendIds),
            'incoming_requests_count' => $incomingPendingCount,
            'data' => $items,
            'current_page' => $posts->currentPage(),
            'total' => $posts->total(),
            'has_more' => $posts->hasMorePages(),
        ]);
    }

    /**
     * Create Post (Guided 5-step process or direct payload)
     */
    public function store(Request $request)
    {
        $request->validate([
            'image' => 'required', // file or base64
            'caption' => 'nullable|string',
            'location_name' => 'nullable|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'tagged_user_ids' => 'nullable|array',
            'use_ai_caption' => 'nullable|boolean',
        ]);

        $user = $request->user();

        // 1. Upload media
        $mediaResult = $this->storageService->storeImage($request->image, 'posts');

        // 2. Resolve tagged users
        $taggedNames = [];
        $taggedIds = $request->input('tagged_user_ids', []);
        if (!empty($taggedIds)) {
            $taggedUsers = User::whereIn('id', $taggedIds)->get();
            $taggedNames = $taggedUsers->pluck('name')->toArray();
        }

        // 3. AI Caption generation if requested or caption empty
        $aiCaption = null;
        $caption = $request->input('caption');
        if (empty($caption) || $request->boolean('use_ai_caption', true)) {
            $aiCaption = $this->aiService->generateSocialCaption(
                $user->id,
                $mediaResult['file_url'],
                $request->location_name,
                $taggedNames
            );
            if (empty($caption)) {
                $caption = $aiCaption;
            }
        }

        // 4. Calculate next post number for this user
        $nextNumber = SocialPost::where('user_id', $user->id)->count() + 1;

        // 5. Create Social Post
        $post = SocialPost::create([
            'user_id' => $user->id,
            'post_number' => $nextNumber,
            'caption' => $caption,
            'ai_caption' => $aiCaption,
            'location_name' => $request->location_name,
            'latitude' => $request->latitude,
            'longitude' => $request->longitude,
            'media_url' => $mediaResult['file_url'],
            'media_type' => 'image',
            'likes_count' => 0,
            'comments_count' => 0,
            'is_public' => true,
        ]);

        // Create PostMedia
        PostMedia::create([
            'social_post_id' => $post->id,
            'file_path' => $mediaResult['file_path'],
            'file_url' => $mediaResult['file_url'],
            'media_type' => 'image',
            'mime_type' => $mediaResult['mime_type'],
            'file_size' => $mediaResult['file_size'],
            'blur_score' => $mediaResult['blur_score'],
            'quality_score' => $mediaResult['quality_score'],
        ]);

        // Attach tags + notify tagged friends
        foreach ($taggedIds as $tId) {
            $taggedUser = User::find($tId);
            if ($taggedUser) {
                PostTag::create([
                    'social_post_id' => $post->id,
                    'user_id' => $taggedUser->id,
                    'tagged_name' => $taggedUser->name,
                ]);
                if ($taggedUser->id !== $user->id) {
                    Notification::create([
                        'user_id' => $taggedUser->id,
                        'actor_id' => $user->id,
                        'type' => 'tag',
                        'title' => 'Tagged in Post',
                        'message' => "{$user->name} tagged you in a photo.",
                        'data' => ['post_id' => $post->id],
                        'is_read' => false,
                    ]);
                }
            }
        }

        // Attach to user default album
        $album = Album::firstOrCreate(
            ['user_id' => $user->id, 'title' => 'Default Album'],
            ['description' => "{$user->name}'s primary photos album", 'cover_url' => $mediaResult['file_url']]
        );
        $album->increment('posts_count');
        AlbumMedia::create([
            'album_id' => $album->id,
            'social_post_id' => $post->id,
            'position' => $album->posts_count,
        ]);

        $post->load(['user.profile', 'media', 'tags']);
        $spokenConfirmation = "Your post has been created successfully. Caption: {$caption}";

        return response()->json([
            'success' => true,
            'message' => 'Post created successfully.',
            'spoken_text' => $spokenConfirmation,
            'post' => $post,
        ], 201);
    }

    /**
     * Show single post
     */
    public function show($id)
    {
        $post = SocialPost::with(['user.profile', 'media', 'tags.user', 'comments.user.profile'])->findOrFail($id);
        $author = $post->user->name ?? 'Community Member';
        $caption = $post->caption ?: ($post->ai_caption ?: 'No caption');
        $spokenNarration = "{$author} posted: {$caption}. Located at " . ($post->location_name ?: 'unspecified location') . ". Has {$post->likes_count} likes and {$post->comments_count} comments.";

        return response()->json([
            'success' => true,
            'post' => $post,
            'spoken_narration' => $spokenNarration,
        ]);
    }

    /**
     * Like or unlike post
     */
    public function like(Request $request, $id)
    {
        $post = SocialPost::findOrFail($id);
        $user = $request->user();

        $like = PostLike::where('social_post_id', $post->id)->where('user_id', $user->id)->first();
        if ($like) {
            $like->delete();
            $post->decrement('likes_count');
            $status = 'unliked';
            $spoken = "You unliked this post.";
        } else {
            PostLike::create(['social_post_id' => $post->id, 'user_id' => $user->id]);
            $post->increment('likes_count');
            $status = 'liked';
            $spoken = "You liked this post.";
            if ($post->user_id !== $user->id) {
                Notification::create([
                    'user_id' => $post->user_id,
                    'actor_id' => $user->id,
                    'type' => 'like',
                    'title' => 'New Like',
                    'message' => "{$user->name} liked your post.",
                    'data' => ['post_id' => $post->id],
                    'is_read' => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'status' => $status,
            'likes_count' => $post->fresh()->likes_count,
            'spoken_text' => $spoken,
        ]);
    }

    /**
     * Add comment to post
     */
    public function comment(Request $request, $id)
    {
        $request->validate(['comment_text' => 'required|string']);

        $post = SocialPost::findOrFail($id);
        $user = $request->user();

        $comment = PostComment::create([
            'social_post_id' => $post->id,
            'user_id' => $user->id,
            'comment_text' => trim($request->comment_text),
        ]);

        $post->increment('comments_count');
        $comment->load('user.profile');
        $comment->formatted_date = $comment->created_at?->diffForHumans() ?? 'just now';

        if ($post->user_id !== $user->id) {
            Notification::create([
                'user_id' => $post->user_id,
                'actor_id' => $user->id,
                'type' => 'comment',
                'title' => 'New Comment',
                'message' => "{$user->name} commented on your post.",
                'data' => ['post_id' => $post->id],
                'is_read' => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Comment added.',
            'spoken_text' => 'Comment posted successfully.',
            'comment' => $comment,
            'comments_count' => $post->fresh()->comments_count,
        ]);
    }

    /**
     * Author Album (Swipe right from feed or open a friend's album)
     */
    public function authorAlbum(Request $request, $userId = null)
    {
        $viewer = auth('sanctum')->user() ?? $request->user();
        $targetUserId = $userId ?: $viewer?->id;

        if (!$targetUserId) {
            return response()->json([
                'success' => false,
                'message' => 'User album could not be resolved.',
            ], 401);
        }

        $user = User::with('profile')->findOrFail($targetUserId);

        $posts = SocialPost::with(['media', 'tags.user'])
            ->where('user_id', $user->id)
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($post) {
                $post->formatted_date = $post->created_at?->diffForHumans() ?? 'recently';
                return $post;
            });

        $count = $posts->count();
        $rel = $viewer
            ? Friendship::relationshipBetween($viewer->id, (int) $user->id)
            : ['status' => 'none', 'friendship_id' => null];

        $spokenText = "{$user->name}'s Album. There " . ($count === 1 ? 'is 1 post' : "are {$count} posts") . ". Swipe left to return to the Social Feed.";

        return response()->json([
            'success' => true,
            'user' => $user,
            'friend_status' => $rel['status'],
            'friendship_id' => $rel['friendship_id'],
            'posts_count' => $count,
            'spoken_text' => $spokenText,
            'posts' => $posts,
        ]);
    }

    /**
     * Voice Post Search
     * Support searching by: date, post number, caption content, author name.
     */
    public function search(Request $request)
    {
        $query = trim($request->input('query', ''));
        $postNumber = $request->input('post_number');
        $authorName = $request->input('author_name');
        $date = $request->input('date');

        $builder = SocialPost::with(['user.profile', 'media']);

        // Check if query contains "post number 33" or similar
        if (preg_match('/post\s+(?:number\s+)?(\d+)/i', $query, $matches)) {
            $postNumber = (int) $matches[1];
        }

        if (!empty($postNumber)) {
            $builder->where('post_number', $postNumber);
        }

        if (!empty($authorName)) {
            $builder->whereHas('user', function ($q) use ($authorName) {
                $q->where('name', 'like', "%{$authorName}%");
            });
        }

        if (!empty($date)) {
            $builder->whereDate('created_at', $date);
        }

        if (!empty($query) && empty($postNumber)) {
            $builder->where(function ($q) use ($query) {
                $q->where('caption', 'like', "%{$query}%")
                  ->orWhere('ai_caption', 'like', "%{$query}%")
                  ->orWhere('location_name', 'like', "%{$query}%")
                  ->orWhereHas('user', function ($sub) use ($query) {
                      $sub->where('name', 'like', "%{$query}%");
                  });
            });
        }

        $results = $builder->orderBy('id', 'desc')->take(10)->get();

        if ($results->isEmpty()) {
            return response()->json([
                'success' => true,
                'count' => 0,
                'results' => [],
                'spoken_text' => "No posts found matching '{$query}'. Swipe left to return to the album.",
            ]);
        }

        $first = $results->first();
        $author = $first->user->name ?? 'User';
        $num = $first->post_number;
        $caption = $first->caption ?: ($first->ai_caption ?: 'A shared photo');
        $spokenText = "{$author}'s post number {$num} found. Caption: {$caption}. Found {$results->count()} post(s) total.";

        return response()->json([
            'success' => true,
            'count' => $results->count(),
            'spoken_text' => $spokenText,
            'results' => $results,
        ]);
    }

    /**
     * Report post
     */
    public function report(Request $request, $id)
    {
        $request->validate(['reason' => 'required|string']);

        $post = SocialPost::findOrFail($id);
        $user = $request->user();

        PostReport::create([
            'social_post_id' => $post->id,
            'reported_by_user_id' => $user->id,
            'reason' => $request->reason,
            'status' => 'pending',
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Post reported for review.',
            'spoken_text' => 'Thank you. The post has been flagged for moderation.',
        ]);
    }
}
