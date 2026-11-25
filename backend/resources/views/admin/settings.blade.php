@extends('admin.layout')

@section('title', 'System Settings & API Configuration')

@section('content')
<div class="d-flex justify-content-between align-items-center mb-4">
    <div>
        <h2 class="fw-bold mb-0 text-dark">System Settings & API Integrations</h2>
        <p class="text-muted mb-0 small">Configure third-party service providers (OpenAI, Maps, Weather, SMS OTP)</p>
    </div>
</div>

<div class="row g-4">
    <!-- API Credentials Form -->
    <div class="col-lg-7">
        <div class="card border-0 shadow-sm rounded-4">
            <div class="card-header bg-white border-0 pt-4 px-4 pb-2">
                <h5 class="fw-bold mb-0"><i class="bi bi-key-fill text-primary me-2"></i> Third-Party API Keys</h5>
            </div>
            <div class="card-body p-4">
                <form action="{{ route('admin.settings.save') }}" method="POST">
                    @csrf
                    
                    <div class="mb-3">
                        <label class="form-label fw-semibold text-secondary small">OpenAI API Key (Vision & Assistant)</label>
                        <input type="password" name="openai_api_key" class="form-control" placeholder="sk-..." value="{{ $settings['openai_api_key']->value ?? env('OPENAI_API_KEY') }}">
                        <div class="form-text small">Used for conversational assistant, image descriptions, and surroundings visualization.</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold text-secondary small">Google Maps API Key</label>
                        <input type="password" name="google_maps_api_key" class="form-control" placeholder="AIza..." value="{{ $settings['google_maps_api_key']->value ?? env('GOOGLE_MAPS_API_KEY') }}">
                        <div class="form-text small">Powers GPS Geocoding, Nearby Places, and Travel Duration calculations.</div>
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold text-secondary small">OpenWeatherMap API Key</label>
                        <input type="password" name="openweather_api_key" class="form-control" placeholder="Key..." value="{{ $settings['openweather_api_key']->value ?? env('OPENWEATHER_API_KEY') }}">
                        <div class="form-text small">Supplies real-time temperature, rain probability, humidity, and forecast.</div>
                    </div>

                    <hr class="my-4">

                    <h6 class="fw-bold text-dark mb-3">SMS OTP Provider (Twilio)</h6>
                    <div class="mb-3">
                        <label class="form-label fw-semibold text-secondary small">Twilio Account SID</label>
                        <input type="text" name="twilio_sid" class="form-control" placeholder="AC..." value="{{ $settings['twilio_sid']->value ?? env('TWILIO_SID') }}">
                    </div>

                    <div class="mb-3">
                        <label class="form-label fw-semibold text-secondary small">Twilio Auth Token</label>
                        <input type="password" name="twilio_auth_token" class="form-control" placeholder="Token..." value="{{ $settings['twilio_auth_token']->value ?? env('TWILIO_AUTH_TOKEN') }}">
                    </div>

                    <button type="submit" class="btn btn-primary px-4 fw-semibold">
                        <i class="bi bi-save me-1"></i> Save Configuration
                    </button>
                </form>
            </div>
        </div>
    </div>

    <!-- Supported Languages & Info -->
    <div class="col-lg-5">
        <div class="card border-0 shadow-sm rounded-4 mb-4">
            <div class="card-header bg-white border-0 pt-4 px-4 pb-2">
                <h5 class="fw-bold mb-0"><i class="bi bi-translate text-info me-2"></i> Supported Accessibility Languages</h5>
            </div>
            <div class="card-body p-4">
                <div class="table-responsive">
                    <table class="table align-middle">
                        <thead class="small text-muted">
                            <tr>
                                <th>Code</th>
                                <th>Language</th>
                                <th>Native Name</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            @forelse($languages as $lang)
                            <tr>
                                <td><code>{{ $lang->code }}</code></td>
                                <td class="fw-medium">{{ $lang->name }}</td>
                                <td>{{ $lang->native_name }}</td>
                                <td>
                                    <span class="badge bg-success-subtle text-success">Enabled</span>
                                </td>
                            </tr>
                            @empty
                            <tr><td colspan="4" class="text-center text-muted">No languages listed.</td></tr>
                            @endforelse
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm rounded-4 bg-primary-subtle text-primary p-3">
            <div class="d-flex align-items-center gap-3">
                <i class="bi bi-link-45deg fs-1"></i>
                <div>
                    <h6 class="fw-bold mb-1">Shared Website Integration</h6>
                    <p class="small mb-0">Connected to <strong>https://www.wezey.com</strong>. Mobile apps and web users share the identical database, auth sessions, and REST endpoints.</p>
                </div>
            </div>
        </div>
    </div>
</div>
@endsection
