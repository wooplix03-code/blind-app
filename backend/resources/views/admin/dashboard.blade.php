@extends('admin.layout')

@section('title', 'System Overview')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-0 text-dark">Platform Dashboard</h2>
        <p class="text-muted mb-0 small">Real-time statistics for Wezey AI Accessibility Network</p>
    </div>
    <div>
        <span class="badge bg-success-subtle text-success border border-success-subtle px-3 py-2 rounded-pill">
            <i class="bi bi-circle-fill me-1 small"></i> System Operational
        </span>
    </div>
</div>

<!-- Key Metrics Row -->
<div class="row g-3 mb-4">
    <div class="col-sm-6 col-xl-3">
        <div class="card metric-card bg-white p-3">
            <div class="d-flex align-items-center">
                <div class="rounded-3 bg-primary-subtle text-primary p-3 me-3">
                    <i class="bi bi-people-fill fs-3"></i>
                </div>
                <div>
                    <div class="text-secondary small fw-medium">Total Users</div>
                    <div class="fs-3 fw-bold text-dark">{{ number_format($totalUsers) }}</div>
                    <div class="small text-success"><i class="bi bi-arrow-up"></i> {{ $activeUsers }} Active</div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-sm-6 col-xl-3">
        <div class="card metric-card bg-white p-3">
            <div class="d-flex align-items-center">
                <div class="rounded-3 bg-info-subtle text-info p-3 me-3">
                    <i class="bi bi-camera-fill fs-3"></i>
                </div>
                <div>
                    <div class="text-secondary small fw-medium">Social Posts</div>
                    <div class="fs-3 fw-bold text-dark">{{ number_format($totalPosts) }}</div>
                    <div class="small text-muted">{{ $totalMedia }} Media Files</div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-sm-6 col-xl-3">
        <div class="card metric-card bg-white p-3">
            <div class="d-flex align-items-center">
                <div class="rounded-3 bg-warning-subtle text-warning p-3 me-3">
                    <i class="bi bi-cpu-fill fs-3"></i>
                </div>
                <div>
                    <div class="text-secondary small fw-medium">AI Requests</div>
                    <div class="fs-3 fw-bold text-dark">{{ number_format($totalAiRequests) }}</div>
                    <div class="small text-muted">{{ number_format($totalTokens) }} Tokens</div>
                </div>
            </div>
        </div>
    </div>

    <div class="col-sm-6 col-xl-3">
        <div class="card metric-card bg-white p-3">
            <div class="d-flex align-items-center">
                <div class="rounded-3 bg-success-subtle text-success p-3 me-3">
                    <i class="bi bi-currency-dollar fs-3"></i>
                </div>
                <div>
                    <div class="text-secondary small fw-medium">Estimated AI Cost</div>
                    <div class="fs-3 fw-bold text-dark">${{ number_format($estimatedAiCost, 4) }}</div>
                    <div class="small text-muted">{{ $aiErrors }} Errors</div>
                </div>
            </div>
        </div>
    </div>
</div>

<div class="row g-4">
    <!-- Recent Users -->
    <div class="col-lg-6">
        <div class="card border-0 shadow-sm rounded-4 h-100">
            <div class="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-center">
                <h5 class="fw-bold mb-0">Recent User Registrations</h5>
                <a href="{{ route('admin.users') }}" class="btn btn-sm btn-link text-decoration-none">View All</a>
            </div>
            <div class="card-body px-4">
                <div class="table-responsive">
                    <table class="table align-middle table-hover">
                        <thead class="text-muted small">
                            <tr>
                                <th>User</th>
                                <th>Phone</th>
                                <th>Language</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($recentUsers as $user)
                            <tr>
                                <td>
                                    <div class="fw-semibold text-dark">{{ $user->name }}</div>
                                    <div class="small text-muted">{{ $user->email ?? 'No email' }}</div>
                                </td>
                                <td class="small">{{ $user->phone_number ?? '-' }}</td>
                                <td><span class="badge bg-secondary-subtle text-secondary text-uppercase">{{ $user->current_language }}</span></td>
                                <td>
                                    @if($user->is_active)
                                        <span class="badge bg-success-subtle text-success">Active</span>
                                    @else
                                        <span class="badge bg-danger-subtle text-danger">Inactive</span>
                                    @endif
                                </td>
                            </tr>
                            @empty
                            <tr><td colspan="4" class="text-center py-3 text-muted">No users registered yet.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Recent Activity Log -->
    <div class="col-lg-6">
        <div class="card border-0 shadow-sm rounded-4 h-100">
            <div class="card-header bg-white border-0 pt-4 px-4 pb-2">
                <h5 class="fw-bold mb-0">Recent Voice & System Activities</h5>
            </div>
            <div class="card-body px-4">
                <div class="list-group list-group-flush">
                    @forelse($recentActivities as $activity)
                    <div class="list-group-item px-0 py-2 border-0 d-flex justify-content-between align-items-center">
                        <div>
                            <span class="badge bg-primary-subtle text-primary me-2">{{ ucfirst($activity->action) }}</span>
                            <span class="small fw-medium">{{ $activity->user->name ?? 'Guest User' }}</span>
                        </div>
                        <span class="small text-muted">{{ $activity->created_at->diffForHumans() }}</span>
                    </div>
                    @empty
                    <div class="text-center py-4 text-muted small">No recent activity logged.</div>
                    @endforelse
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
