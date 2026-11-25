@extends('admin.layout')

@section('title', 'Social Posts & Content Moderation')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-0 text-dark">Social Posts & Moderation</h2>
        <p class="text-muted mb-0 small">Review uploaded media, AI-generated captions, and reported posts</p>
    </div>
</div>

<!-- Reported Content Card -->
@if($reports->isNotEmpty())
<div class="card border-danger shadow-sm rounded-4 mb-4">
    <div class="card-header bg-danger text-white py-3 px-4">
        <h5 class="fw-bold mb-0"><i class="bi bi-flag-fill me-2"></i> Content Reported for Moderation</h5>
    </div>
    <div class="card-body p-4">
        <div class="table-responsive">
            <table class="table align-middle">
                <thead>
                    <tr>
                        <th>Post #</th>
                        <th>Author</th>
                        <th>Report Reason</th>
                        <th>Reported By</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($reports as $rep)
                    <tr>
                        <td>#{{ $rep->social_post_id }}</td>
                        <td>{{ $rep->post->user->name ?? 'Unknown' }}</td>
                        <td class="text-danger fw-semibold">{{ $rep->reason }}</td>
                        <td>{{ $rep->reportedBy->name ?? 'Member' }}</td>
                        <td><span class="badge bg-warning">{{ ucfirst($rep->status) }}</span></td>
                        <td>
                            <form action="{{ route('admin.posts.delete', $rep->social_post_id) }}" method="POST" class="d-inline" onsubmit="return confirm('Delete this post?');">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-danger">Delete Post</button>
                            </form>
                            <form action="{{ route('admin.reports.dismiss', $rep->id) }}" method="POST" class="d-inline ms-1">
                                @csrf
                                <button type="submit" class="btn btn-sm btn-outline-secondary">Dismiss</button>
                            </form>
                        </td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
        </div>
    </div>
</div>
@endif

<!-- All Social Posts -->
<div class="card border-0 shadow-sm rounded-4">
    <div class="card-header bg-white border-0 pt-4 px-4 pb-2">
        <h5 class="fw-bold mb-0">All Social Feed Posts</h5>
    </div>
    <div class="card-body p-4">
        <div class="table-responsive">
            <table class="table align-middle table-hover">
                <thead class="table-light small">
                    <tr>
                        <th>Post #</th>
                        <th>Photo</th>
                        <th>Author</th>
                        <th>Caption & AI Description</th>
                        <th>Location</th>
                        <th>Engagement</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($posts as $p)
                    <tr>
                        <td><strong>#{{ $p->post_number }}</strong></td>
                        <td>
                            @if($p->media_url)
                                <img src="{{ $p->media_url }}" alt="Post image" class="rounded-3 shadow-sm object-fit-cover" style="width: 50px; height: 50px;">
                            @else
                                <span class="badge bg-light text-secondary">No media</span>
                            @endif
                        </td>
                        <td>
                            <div class="fw-bold">{{ $p->user->name ?? 'User' }}</div>
                        </td>
                        <td style="max-width: 280px;">
                            <div class="text-truncate">{{ $p->caption }}</div>
                            @if($p->ai_caption && $p->ai_caption !== $p->caption)
                                <small class="text-muted fst-italic">AI: {{ Str::limit($p->ai_caption, 40) }}</small>
                            @endif
                        </td>
                        <td><small>{{ $p->location_name ?? 'None' }}</small></td>
                        <td>
                            <span class="badge bg-light text-dark"><i class="bi bi-heart-fill text-danger me-1"></i>{{ $p->likes_count }}</span>
                            <span class="badge bg-light text-dark"><i class="bi bi-chat-fill text-primary me-1"></i>{{ $p->comments_count }}</span>
                        </td>
                        <td class="small text-muted">{{ $p->created_at->format('M d, H:i') }}</td>
                        <td>
                            <form action="{{ route('admin.posts.delete', $p->id) }}" method="POST" onsubmit="return confirm('Are you sure you want to delete this post?');">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-outline-danger">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">No posts found in database.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            {{ $posts->links('pagination::bootstrap-5') }}
        </div>
    </div>
</div>
@endsection
