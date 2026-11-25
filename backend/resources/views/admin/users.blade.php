@extends('admin.layout')

@section('title', 'User Management')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-0 text-dark">User Management</h2>
        <p class="text-muted mb-0 small">Review, search and manage blind & visually impaired user profiles</p>
    </div>
</div>

<div class="card border-0 shadow-sm rounded-4 mb-4">
    <div class="card-body p-4">
        <form method="GET" action="{{ route('admin.users') }}" class="row g-2 mb-3">
            <div class="col-md-5">
                <div class="input-group">
                    <span class="input-group-text bg-white"><i class="bi bi-search"></i></span>
                    <input type="text" name="search" class="form-control" placeholder="Search by name, email, or phone number..." value="{{ request('search') }}">
                </div>
            </div>
            <div class="col-auto">
                <button type="submit" class="btn btn-primary px-4">Search</button>
                @if(request('search'))
                    <a href="{{ route('admin.users') }}" class="btn btn-outline-secondary">Clear</a>
                @endif
            </div>
        </form>

        <div class="table-responsive">
            <table class="table align-middle table-hover">
                <thead class="table-light small">
                    <tr>
                        <th>ID</th>
                        <th>User Name</th>
                        <th>Phone Number</th>
                        <th>Email</th>
                        <th>Face Enrolled</th>
                        <th>Language</th>
                        <th>Registered</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($users as $user)
                    <tr>
                        <td><span class="badge bg-light text-dark">#{{ $user->id }}</span></td>
                        <td>
                            <div class="fw-bold text-dark">{{ $user->name }}</div>
                            <div class="small text-muted">{{ $user->profile->bio ?? 'No bio set' }}</div>
                        </td>
                        <td>{{ $user->phone_number ?? '-' }}</td>
                        <td>{{ $user->email ?? 'No email' }}</td>
                        <td>
                            @if($user->face_enrolled)
                                <span class="badge bg-success-subtle text-success"><i class="bi bi-shield-check"></i> Enrolled</span>
                            @else
                                <span class="badge bg-secondary-subtle text-secondary">Not Enrolled</span>
                            @endif
                        </td>
                        <td><span class="badge bg-info-subtle text-info text-uppercase">{{ $user->current_language }}</span></td>
                        <td class="small text-muted">{{ $user->created_at->format('M d, Y') }}</td>
                        <td>
                            @if($user->is_active)
                                <span class="badge bg-success">Active</span>
                            @else
                                <span class="badge bg-danger">Deactivated</span>
                            @endif
                        </td>
                        <td>
                            <form action="{{ route('admin.users.toggle', $user->id) }}" method="POST" class="d-inline">
                                @csrf
                                <button type="submit" class="btn btn-sm {{ $user->is_active ? 'btn-outline-danger' : 'btn-outline-success' }}">
                                    {{ $user->is_active ? 'Deactivate' : 'Activate' }}
                                </button>
                            </form>
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="9" class="text-center py-4 text-muted">No users found.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            {{ $users->links('pagination::bootstrap-5') }}
        </div>
    </div>
</div>
@endsection
