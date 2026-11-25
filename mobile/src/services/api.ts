// WEZEY API Client for Laravel Backend

const isNativeCapacitor =
  typeof window !== 'undefined' && Boolean((window as any).Capacitor?.isNativePlatform?.());

function resolveApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const savedOverride = localStorage.getItem('wezey_server_url')?.trim();
    if (savedOverride) {
      return savedOverride.replace(/\/+$/, '');
    }
  }
  return (
    import.meta.env.VITE_API_URL ||
    (isNativeCapacitor ? 'http://192.168.1.9:8000/api/v1' : '/api/v1')
  );
}

function normalizeLocalMediaUrls<T>(value: T): T {
  if (value == null) return value;
  const activeBase = resolveApiBaseUrl();
  const origin = activeBase.startsWith('http')
    ? activeBase.replace(/\/api\/v1\/?$/i, '')
    : '';

  if (typeof value === 'string') {
    return value.replace(
      /^https?:\/\/(127\.0\.0\.1|localhost):8000(\/storage\/)/i,
      origin ? `${origin}$2` : '$2'
    ) as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeLocalMediaUrls(item)) as T;
  }
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value as Record<string, any>)) {
      out[k] = normalizeLocalMediaUrls(v);
    }
    return out as T;
  }
  return value;
}

class ApiService {
  private token: string | null = null;
  private currentUser: any = null;

  constructor() {
    this.token = localStorage.getItem('wezey_token');
    try {
      const storedUser = localStorage.getItem('wezey_user');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
      }
    } catch {
      this.currentUser = null;
    }
  }

  public getServerUrl(): string {
    return resolveApiBaseUrl();
  }

  public setServerUrl(url: string | null) {
    if (typeof window === 'undefined') return;
    const cleaned = (url || '').trim().replace(/\/+$/, '');
    if (!cleaned) {
      localStorage.removeItem('wezey_server_url');
      return;
    }
    const normalized = /\/api\/v1$/i.test(cleaned) ? cleaned : `${cleaned}/api/v1`;
    localStorage.setItem('wezey_server_url', normalized);
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('wezey_token', token);
    } else {
      localStorage.removeItem('wezey_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public setUser(user: any | null) {
    this.currentUser = user;
    if (user) {
      localStorage.setItem('wezey_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('wezey_user');
    }
  }

  public getUser(): any | null {
    if (!this.currentUser) {
      try {
        const storedUser = localStorage.getItem('wezey_user');
        if (storedUser) {
          this.currentUser = JSON.parse(storedUser);
        }
      } catch {
        this.currentUser = null;
      }
    }
    return this.currentUser;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const apiBase = resolveApiBaseUrl();
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      ...(apiBase.includes('ngrok') ? { 'ngrok-skip-browser-warning': 'true' } : {}),
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();
      if (!response.ok) {
        const firstValidationError =
          data?.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).flat()[0]
            : null;
        const err: any = new Error(
          String(firstValidationError || data.message || `API Error: ${response.status}`)
        );
        err.status = response.status;
        err.errors = data?.errors || null;
        err.data = data;
        throw err;
      }
      return normalizeLocalMediaUrls(data);
    } catch (error: any) {
      console.error(`API request failed [${endpoint}]:`, error);
      throw error;
    }
  }

  // Auth & Voice Registration
  public async checkRegistered(phoneNumber?: string) {
    return this.request('/auth/check', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  public async voiceRegister(payload: {
    name: string;
    phone_number: string;
    email?: string;
    face_data?: string;
    otp_code?: string;
  }) {
    const res = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    if (res.user) {
      this.setUser(res.user);
    }
    return res;
  }

  public async login(phoneNumber: string, otpCode?: string) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, otp_code: otpCode }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    if (res.user) {
      this.setUser(res.user);
    }
    return res;
  }

  public async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      console.warn('Logout API error:', e);
    }
    this.setToken(null);
    this.setUser(null);
  }

  public async sendOtp(phoneNumber: string, purpose = 'registration') {
    return this.request('/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, purpose }),
    });
  }

  public async verifyOtp(phoneNumber: string, otpCode: string, purpose = 'registration') {
    return this.request('/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, otp_code: otpCode, purpose }),
    });
  }

  // Profile
  public async getProfile() {
    return this.request('/profile');
  }

  public async updateProfile(data: any) {
    return this.request('/profile/update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async updateLanguage(code: string) {
    return this.request('/profile/language', {
      method: 'POST',
      body: JSON.stringify({ language_code: code }),
    });
  }

  // Social Feed, Friends & Album
  public async getFeed(page = 1, scope: 'all' | 'friends' = 'all') {
    return this.request(`/feed?page=${page}&scope=${scope}`);
  }

  public async getFriends() {
    return this.request('/friends');
  }

  public async searchPeople(query = '') {
    return this.request(`/friends/search?query=${encodeURIComponent(query)}`);
  }

  public async sendFriendRequest(userId: number) {
    return this.request('/friends/request', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    });
  }

  public async acceptFriendRequest(friendshipId: number) {
    return this.request(`/friends/requests/${friendshipId}/accept`, {
      method: 'POST',
    });
  }

  public async declineFriendRequest(friendshipId: number) {
    return this.request(`/friends/requests/${friendshipId}/decline`, {
      method: 'POST',
    });
  }

  public async cancelFriendRequest(friendshipId: number) {
    return this.request(`/friends/requests/${friendshipId}/cancel`, {
      method: 'DELETE',
    });
  }

  public async removeFriend(userId: number) {
    return this.request(`/friends/${userId}`, {
      method: 'DELETE',
    });
  }

  public async getNotifications() {
    return this.request('/notifications');
  }

  public async markNotificationRead(id: number) {
    return this.request(`/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  public async createPost(formData: FormData) {
    return this.request('/posts', {
      method: 'POST',
      body: formData,
    });
  }

  public async likePost(postId: number) {
    return this.request(`/posts/${postId}/like`, { method: 'POST' });
  }

  public async commentPost(postId: number, commentText: string) {
    return this.request(`/posts/${postId}/comment`, {
      method: 'POST',
      body: JSON.stringify({ comment_text: commentText }),
    });
  }

  public async getAlbum(userId?: number) {
    return userId
      ? this.request(`/users/${userId}/album`)
      : this.request('/my-album');
  }

  public async searchPosts(query: string) {
    return this.request(`/posts/search/query?query=${encodeURIComponent(query)}`);
  }

  // AI Modules
  public async aiAsk(question: string, sessionUuid?: string, language?: string) {
    return this.request('/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ question, session_uuid: sessionUuid, language }),
    });
  }

  public async aiNews(country = 'us') {
    return this.request(`/ai/news?country=${country}`);
  }

  public async aiWeather(lat?: number, lon?: number, city?: string) {
    const params = new URLSearchParams();
    if (lat && lon) {
      params.append('latitude', lat.toString());
      params.append('longitude', lon.toString());
    }
    if (city) params.append('city', city);
    return this.request(`/ai/weather?${params.toString()}`);
  }

  public async aiTravel(origin: string, destination: string) {
    return this.request('/ai/travel', {
      method: 'POST',
      body: JSON.stringify({ origin, destination }),
    });
  }

  public async aiVisualize(imageBase64: string, sessionUuid?: string) {
    return this.request('/ai/visualize', {
      method: 'POST',
      body: JSON.stringify({ image: imageBase64, session_uuid: sessionUuid }),
    });
  }

  public async aiContextualAsk(question: string, sessionUuid: string, lat?: number, lon?: number) {
    return this.request('/ai/visualize/ask', {
      method: 'POST',
      body: JSON.stringify({
        question,
        session_uuid: sessionUuid,
        latitude: lat,
        longitude: lon,
      }),
    });
  }

  public async searchUsersForTag(query = '') {
    return this.request(`/users/search?query=${encodeURIComponent(query)}`);
  }

  public async getOpenAiStatus() {
    return this.request('/system/openai-status');
  }

  public async saveOpenAiKey(apiKey: string) {
    return this.request('/system/openai-key', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
  }

  // Wezey Website Navigation API
  public async wezeyWebNavigate(target = 'home') {
    return this.request('/wezey-web/navigate', {
      method: 'POST',
      body: JSON.stringify({ target }),
    });
  }

  public async wezeyWebSitemap() {
    return this.request('/wezey-web/sitemap');
  }
}

export const api = new ApiService();
