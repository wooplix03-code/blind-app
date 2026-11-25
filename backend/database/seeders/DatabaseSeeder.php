<?php

namespace Database\Seeders;

use App\Models\AdminRole;
use App\Models\AdminUser;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiUsageLog;
use App\Models\Album;
use App\Models\AlbumMedia;
use App\Models\ApiIntegration;
use App\Models\AppSetting;
use App\Models\Friendship;
use App\Models\Notification;
use App\Models\PostComment;
use App\Models\PostLike;
use App\Models\PostMedia;
use App\Models\PostTag;
use App\Models\SocialPost;
use App\Models\User;
use App\Models\UserActivityLog;
use App\Models\UserLanguage;
use App\Models\UserPreference;
use App\Models\UserProfile;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Admin Roles & Super Admin
        $superAdminRole = AdminRole::create([
            'name' => 'Super Administrator',
            'slug' => 'super_admin',
            'description' => 'Full administrative access across the platform',
        ]);

        AdminUser::create([
            'name' => 'Wezey Administrator',
            'email' => 'admin@wezey.com',
            'password' => Hash::make('admin123'),
            'role_id' => $superAdminRole->id,
            'is_active' => true,
        ]);

        // 2. Supported Languages
        $languages = [
            ['code' => 'en', 'name' => 'English', 'native_name' => 'English', 'is_default' => true],
            ['code' => 'ms', 'name' => 'Malay', 'native_name' => 'Bahasa Melayu', 'is_default' => false],
            ['code' => 'es', 'name' => 'Spanish', 'native_name' => 'Español', 'is_default' => false],
            ['code' => 'fr', 'name' => 'French', 'native_name' => 'Français', 'is_default' => false],
            ['code' => 'de', 'name' => 'German', 'native_name' => 'Deutsch', 'is_default' => false],
            ['code' => 'hi', 'name' => 'Hindi', 'native_name' => 'हिन्दी', 'is_default' => false],
            ['code' => 'zh', 'name' => 'Chinese', 'native_name' => '中文', 'is_default' => false],
            ['code' => 'ar', 'name' => 'Arabic', 'native_name' => 'العربية', 'is_default' => false],
        ];
        foreach ($languages as $lang) {
            UserLanguage::create($lang);
        }

        // 3. Settings & API Integrations
        AppSetting::set('app_name', 'WEZEY', 'general', 'Platform Name');
        AppSetting::set('support_email', 'support@wezey.com', 'general', 'Support Email');
        AppSetting::set('website_url', 'https://www.wezey.com', 'general', 'Public Website');
        AppSetting::set('default_country_news', 'US', 'news', 'Default Country Code for News');

        ApiIntegration::create([
            'provider_name' => 'openai',
            'is_active' => true,
            'settings' => ['model' => 'gpt-4o-mini', 'vision_model' => 'gpt-4o'],
        ]);
        ApiIntegration::create([
            'provider_name' => 'google_maps',
            'is_active' => true,
            'settings' => ['geocoding' => true, 'places' => true, 'directions' => true],
        ]);
        ApiIntegration::create([
            'provider_name' => 'twilio',
            'is_active' => true,
            'settings' => ['sender' => 'WEZEY'],
        ]);

        // 4. Create Primary Users
        // User 1: John Carter (Matches Prompt Requirements)
        $john = User::create([
            'name' => 'John Carter',
            'phone_number' => '+1234567890',
            'email' => 'john@wezey.com',
            'password' => Hash::make('wezey123'),
            'face_enrolled' => true,
            'face_data_hash' => hash('sha256', 'john_carter_biometric_key'),
            'current_language' => 'en',
            'is_active' => true,
            'phone_verified_at' => now(),
        ]);
        UserProfile::create([
            'user_id' => $john->id,
            'bio' => 'Passionate acoustic guitar player and accessibility advocate.',
            'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
            'emergency_contact' => '+1234567899',
            'address' => 'Miami Beach, Florida',
            'accessibility_mode' => 'voice_first',
        ]);
        UserPreference::create([
            'user_id' => $john->id,
            'speech_rate' => 1.0,
            'speech_pitch' => 1.0,
            'screen_reader_hints' => true,
            'audio_cues_enabled' => true,
            'auto_read_posts' => true,
        ]);

        // User 2: Emma Watson
        $emma = User::create([
            'name' => 'Emma Watson',
            'phone_number' => '+1234567891',
            'email' => 'emma@wezey.com',
            'password' => Hash::make('wezey123'),
            'face_enrolled' => true,
            'current_language' => 'en',
            'is_active' => true,
            'phone_verified_at' => now(),
        ]);
        UserProfile::create([
            'user_id' => $emma->id,
            'bio' => 'Audiobook producer and guide dog trainer.',
            'avatar_url' => 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
            'accessibility_mode' => 'voice_first',
        ]);
        UserPreference::create(['user_id' => $emma->id]);

        // User 3: Michael Chang
        $michael = User::create([
            'name' => 'Michael Chang',
            'phone_number' => '+1234567892',
            'email' => 'michael@wezey.com',
            'password' => Hash::make('wezey123'),
            'current_language' => 'en',
            'is_active' => true,
            'phone_verified_at' => now(),
        ]);
        UserProfile::create([
            'user_id' => $michael->id,
            'bio' => 'Software developer and podcast host.',
            'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
            'accessibility_mode' => 'voice_first',
        ]);
        UserPreference::create(['user_id' => $michael->id]);

        // 4b. Seed starter friendships among John, Emma, and Michael
        Friendship::create([
            'requester_id' => $john->id,
            'addressee_id' => $emma->id,
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);
        Friendship::create([
            'requester_id' => $john->id,
            'addressee_id' => $michael->id,
            'status' => 'accepted',
            'accepted_at' => now(),
        ]);

        // 5. Albums
        $johnAlbum = Album::create([
            'user_id' => $john->id,
            'title' => "John Carter's Album",
            'description' => 'Collection of personal and travel experiences',
            'cover_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
            'posts_count' => 3,
        ]);

        // 6. Social Posts (Prompt exact scenarios)
        // Post 1: John Carter beach post (Matching prompt: "Enjoying a beautiful sunny day at the beach.")
        $post1 = SocialPost::create([
            'user_id' => $john->id,
            'post_number' => 33, // Matches prompt search example: "John Carter's post number 33 found"
            'caption' => 'Enjoying a beautiful sunny day at the beach.',
            'ai_caption' => 'A bright sunny ocean shore with gentle waves breaking on golden sand under a blue sky.',
            'location_name' => 'South Beach, Miami',
            'latitude' => 25.7617,
            'longitude' => -80.1918,
            'media_url' => 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
            'media_type' => 'image',
            'likes_count' => 24,
            'comments_count' => 2,
            'is_public' => true,
        ]);
        PostMedia::create([
            'social_post_id' => $post1->id,
            'file_path' => 'posts/beach.jpg',
            'file_url' => $post1->media_url,
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 254890,
            'blur_score' => 0.95,
            'quality_score' => 0.98,
        ]);
        PostTag::create(['social_post_id' => $post1->id, 'user_id' => $emma->id, 'tagged_name' => 'Emma Watson']);
        PostTag::create(['social_post_id' => $post1->id, 'user_id' => $michael->id, 'tagged_name' => 'Michael Chang']);
        PostLike::create(['social_post_id' => $post1->id, 'user_id' => $emma->id]);
        PostLike::create(['social_post_id' => $post1->id, 'user_id' => $michael->id]);
        PostComment::create([
            'social_post_id' => $post1->id,
            'user_id' => $emma->id,
            'comment_text' => 'The ocean breeze sounds so peaceful John!',
        ]);
        PostComment::create([
            'social_post_id' => $post1->id,
            'user_id' => $michael->id,
            'comment_text' => 'Hope you had a wonderful afternoon.',
        ]);
        AlbumMedia::create(['album_id' => $johnAlbum->id, 'social_post_id' => $post1->id, 'position' => 1]);

        // Post 2: Emma Watson Guide Dog in Park
        $post2 = SocialPost::create([
            'user_id' => $emma->id,
            'post_number' => 1,
            'caption' => 'Morning walk in Central Park with Barnaby.',
            'ai_caption' => 'A golden retriever guide dog sitting proudly on a lush green lawn near park trees.',
            'location_name' => 'Central Park, New York',
            'latitude' => 40.785091,
            'longitude' => -73.968285,
            'media_url' => 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
            'media_type' => 'image',
            'likes_count' => 18,
            'comments_count' => 1,
            'is_public' => true,
        ]);
        PostMedia::create([
            'social_post_id' => $post2->id,
            'file_path' => 'posts/dog.jpg',
            'file_url' => $post2->media_url,
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 184500,
            'blur_score' => 0.98,
            'quality_score' => 0.99,
        ]);
        PostLike::create(['social_post_id' => $post2->id, 'user_id' => $john->id]);
        PostComment::create([
            'social_post_id' => $post2->id,
            'user_id' => $john->id,
            'comment_text' => 'Barnaby looks as handsome as always!',
        ]);

        // Post 3: Michael Chang Coffee Shop
        $post3 = SocialPost::create([
            'user_id' => $michael->id,
            'post_number' => 1,
            'caption' => 'Trying a new artisan roast with fresh cinnamon roll.',
            'ai_caption' => 'A warm wooden table with a white ceramic mug of latte art coffee and fresh pastry.',
            'location_name' => 'Artisan Coffee Roasters, Boston',
            'latitude' => 42.3601,
            'longitude' => -71.0589,
            'media_url' => 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=800&q=80',
            'media_type' => 'image',
            'likes_count' => 12,
            'comments_count' => 0,
            'is_public' => true,
        ]);
        PostMedia::create([
            'social_post_id' => $post3->id,
            'file_path' => 'posts/coffee.jpg',
            'file_url' => $post3->media_url,
            'media_type' => 'image',
            'mime_type' => 'image/jpeg',
            'file_size' => 142000,
            'blur_score' => 0.91,
            'quality_score' => 0.94,
        ]);

        // 7. Seed sample AI Usage Logs
        AiUsageLog::create([
            'user_id' => $john->id,
            'feature' => 'vision_caption',
            'model' => 'gpt-4o',
            'prompt_tokens' => 120,
            'completion_tokens' => 18,
            'total_tokens' => 138,
            'estimated_cost_usd' => 0.00069,
            'status' => 'success',
        ]);
        AiUsageLog::create([
            'user_id' => $john->id,
            'feature' => 'chat',
            'model' => 'gpt-4o-mini',
            'prompt_tokens' => 50,
            'completion_tokens' => 40,
            'total_tokens' => 90,
            'estimated_cost_usd' => 0.00001,
            'status' => 'success',
        ]);
        AiUsageLog::create([
            'user_id' => $emma->id,
            'feature' => 'visualization_qa',
            'model' => 'gpt-4o',
            'prompt_tokens' => 160,
            'completion_tokens' => 30,
            'total_tokens' => 190,
            'estimated_cost_usd' => 0.00095,
            'status' => 'success',
        ]);

        // 8. Seed sample User Activity Logs
        UserActivityLog::create([
            'user_id' => $john->id,
            'action' => 'voice_command',
            'ip_address' => '127.0.0.1',
            'details' => ['command' => 'Open Social Feed'],
        ]);
        UserActivityLog::create([
            'user_id' => $john->id,
            'action' => 'post_created',
            'ip_address' => '127.0.0.1',
            'details' => ['post_id' => $post1->id],
        ]);
        UserActivityLog::create([
            'user_id' => $emma->id,
            'action' => 'image_visualized',
            'ip_address' => '127.0.0.1',
            'details' => ['mode' => 'surroundings_scan'],
        ]);

        // 9. Sample Notification
        Notification::create([
            'user_id' => $john->id,
            'actor_id' => $emma->id,
            'type' => 'comment',
            'title' => 'New Comment',
            'message' => 'Emma Watson commented on your post.',
            'data' => ['post_id' => $post1->id],
            'is_read' => false,
        ]);
    }
}
