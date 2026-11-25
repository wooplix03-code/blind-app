@extends('admin.layout')

@section('title', 'AI Usage & Cost Monitoring')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-0 text-dark">AI Usage & Cost Monitoring</h2>
        <p class="text-muted mb-0 small">Real-time tracking of OpenAI Chat, Vision captions, and scene visualization calls</p>
    </div>
</div>

<div class="row g-3 mb-4">
    <div class="col-md-3">
        <div class="card metric-card bg-white p-3">
            <div class="text-secondary small fw-medium">Total AI Executions</div>
            <div class="fs-3 fw-bold text-dark">{{ number_format($totalRequests) }}</div>
            <div class="small text-muted">{{ $chatRequests }} Chat / {{ $visionRequests }} Vision</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card metric-card bg-white p-3">
            <div class="text-secondary small fw-medium">Total Tokens Consumed</div>
            <div class="fs-3 fw-bold text-dark">{{ number_format($totalTokens) }}</div>
            <div class="small text-muted">Prompt + Completion</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card metric-card bg-white p-3">
            <div class="text-secondary small fw-medium">Estimated Expenditure</div>
            <div class="fs-3 fw-bold text-dark">${{ number_format($totalCost, 4) }}</div>
            <div class="small text-success">Within allocated budget</div>
        </div>
    </div>
    <div class="col-md-3">
        <div class="card metric-card bg-white p-3">
            <div class="text-secondary small fw-medium">Vision Accessibility Calls</div>
            <div class="fs-3 fw-bold text-dark">{{ $visionRequests }}</div>
            <div class="small text-info">Scene Descriptions</div>
        </div>
    </div>
</div>

<div class="card border-0 shadow-sm rounded-4">
    <div class="card-header bg-white border-0 pt-4 px-4 pb-2">
        <h5 class="fw-bold mb-0">AI API Request Logs</h5>
    </div>
    <div class="card-body p-4">
        <div class="table-responsive">
            <table class="table align-middle table-hover">
                <thead class="table-light small">
                    <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Feature</th>
                        <th>Model</th>
                        <th>Tokens</th>
                        <th>Est. Cost</th>
                        <th>Status</th>
                        <th>Time</th>
                    </tr>
                </thead>
                <tbody>
                    @forelse($logs as $log)
                    <tr>
                        <td>#{{ $log->id }}</td>
                        <td>{{ $log->user->name ?? 'Guest User' }}</td>
                        <td>
                            <span class="badge bg-primary-subtle text-primary">{{ ucfirst($log->feature) }}</span>
                        </td>
                        <td><code>{{ $log->model }}</code></td>
                        <td>{{ number_format($log->total_tokens) }}</td>
                        <td>${{ number_format($log->estimated_cost_usd, 5) }}</td>
                        <td>
                            @if($log->status === 'success')
                                <span class="badge bg-success-subtle text-success">Success</span>
                            @else
                                <span class="badge bg-danger-subtle text-danger">Failed</span>
                            @endif
                        </td>
                        <td class="small text-muted">{{ $log->created_at->format('M d, H:i:s') }}</td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="8" class="text-center py-4 text-muted">No AI calls recorded yet.</td>
                    </tr>
                    @endforelse
                </tbody>
            </table>
        </div>

        <div class="mt-3">
            {{ $logs->links('pagination::bootstrap-5') }}
        </div>
    </div>
</div>
@endsection
